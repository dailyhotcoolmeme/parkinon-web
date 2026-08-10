#!/usr/bin/env node
/*
 * 파킨온 소식(src/content/articles/ko/news/*.mdx) → 앱 정보·나눔 피드 동기화.
 *
 * 배경(2026-08-10, 오너 지시): 앱에 있던 "뉴스 크롤링" 기능은 실제로 만들어진 적이 없었다
 * (설계문서만 있었음, `parkinon-app/docs/agents/AGENT_10_crawling.md` 삭제됨). 그 대신
 * 이 사이트에서 직접 쓰는 소식 글을 앱 커뮤니티(정보·나눔)에 진짜 게시글로 밀어넣는다.
 *
 * `posts` 테이블엔 이미 is_news/news_url/author_name_override 컬럼이 준비돼 있었다
 * (앱이 언젠가 쓸 걸 대비해 만들어졌지만 아무도 안 쓰고 있었음) — 그래서 별도 news_feed
 * 테이블(죽은 테이블, 버그투성이) 대신 이 컬럼을 그대로 쓴다. 좋아요·댓글도 실제 posts
 * FK라 정상 동작한다(오너 결정 — 소식 글도 좋아요/댓글 허용).
 *
 * 작성자는 전용 "파킨온" 시스템 계정(auth.users+public.users, id는 아래 BOT_USER_ID) —
 * 실제 지인 테스트 계정을 빌려쓰지 않는다(오너·지인 개인정보와 섞이면 안 됨).
 *
 * 이미지 업로드는 앱이 커뮤니티 사진을 올릴 때 쓰는 **같은** r2-upload 엣지함수 경로를
 * 그대로 쓴다(파킨온 시스템 계정으로 로그인 → presigned URL 발급 → PUT). 별도 R2
 * 자격증명이 필요 없고, 이미 검증된 업로드 경로라 안전하다.
 *
 * upsert 기준은 news_url(posts.news_url) — 같은 글을 다시 돌려도 새 게시글이 안 생기고
 * 제목·본문·썸네일만 최신으로 갱신된다. 그래서 이미 배포된 소식 글을 고쳐도 다음 실행에
 * 자동으로 앱에 반영된다.
 *
 * 실행: node scripts/sync-news-posts.mjs  (site/ 에서, .env 에 NEWS_BOT_PASSWORD 필요)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { createClient } from '@supabase/supabase-js';

const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

// 로컬 실행용 .env 로더(다른 crawl 스크립트는 GH Actions 가 env 를 주입해서 필요 없었지만,
// 이건 오너가 로컬에서 직접 돌리는 걸 기본으로 한다). 이미 설정된 값(CI 등)은 덮어쓰지 않는다.
const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key] === undefined) process.env[key] = trimmed.slice(eq + 1).trim();
  }
}
const NEWS_DIR = path.join(ROOT, 'src/content/articles/ko/news');
const SITE_ORIGIN = 'https://parkinon.com';

const BOT_USER_ID = 'c5efd930-1c58-4241-8430-851ebb044442';
const BOT_EMAIL = 'news-bot@parkinon.internal';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const NEWS_BOT_PASSWORD = process.env.NEWS_BOT_PASSWORD;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !NEWS_BOT_PASSWORD) {
  console.error('Missing SUPABASE_URL / SUPABASE_ANON_KEY / NEWS_BOT_PASSWORD env vars (site/.env)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/** MDX 본문의 웹 전용 컴포넌트(Term/SourceQuote/Callout/StoryHead/<b>)를 앱이 그릴 수 있는
 * 순수 마크다운으로 풀어쓴다. react-native-markdown-display 는 raw HTML을 렌더링하지
 * 않으므로 <b> 도 **볼드**로 바꾼다. */
function mdxBodyToPlainMarkdown(raw) {
  let s = raw;
  s = s.replace(/^import .+$/gm, '');
  // 웹의 "소식 N" 킥커 라벨(story-kicker, 녹색 작은 글씨)을 앱에도 그대로 옮긴다 — 오너
  // 지적(2026-08-10): "웹에는 소식1·소식2 구분이 있는데 앱엔 왜 없냐". *기울임*(em) 문법을
  // 빌려서 쓴다 — 본문에 실제 기울임체는 안 쓰므로 markdownStyles.em 을 이 라벨 전용으로
  // 녹색·기울임 해제해서 씀(PostDetailScreen.tsx 참고). 다음 제목과 줄바꿈 한 번만 둬서
  // (빈 줄 없이) 간격이 과하게 벌어지지 않게 한다 — ATX 헤딩(##)은 빈 줄 없이도 단락을
  // 끊고 시작할 수 있다(CommonMark 규칙). 첫 소재는 구분선 없이 라벨만,
  // 이후 소재는 구분선(---) + 라벨.
  s = s.replace(/<StoryHead\s+([^/]*)\/>\s*\n*/g, (_m, attrs) => {
    const idxMatch = attrs.match(/index=\{(\d+)\}/);
    const idx = idxMatch ? idxMatch[1] : '';
    const isFirst = /\bfirst\b/.test(attrs);
    const kicker = `*소식 ${idx}*`;
    return isFirst ? `${kicker}\n` : `\n---\n\n${kicker}\n`;
  });
  s = s.replace(
    /<SourceQuote\s+quote="((?:[^"\\]|\\.)*)"\s+attribution="((?:[^"\\]|\\.)*)"\s+name="((?:[^"\\]|\\.)*)"\s+url="((?:[^"\\]|\\.)*)"\s*\/>/gs,
    (_m, quote, attribution, name, url) => `\n> "${quote}"\n> — ${attribution} ([${name}](${url}))\n`,
  );
  s = s.replace(
    /<Callout\s+text="((?:[^"\\]|\\.)*)"\s*\/>/gs,
    (_m, text) => `\n> 💡 ${text}\n`,
  );
  // Term의 툴팁(brief) 인터랙션은 앱에 없어서 못 옮기지만, href(용어사전 링크)는 살려서
  // 웹으로 나가는 링크로 바꾼다 — 오너 지적(2026-08-10): "링크라도 걸어서 웹으로 보내던가".
  s = s.replace(/<Term\s+([^>]*)>([\s\S]*?)<\/Term>/g, (_m, attrs, inner) => {
    const hrefMatch = attrs.match(/href="((?:[^"\\]|\\.)*)"/);
    const bold = `**${inner.trim()}**`;
    return hrefMatch ? `[${bold}](${hrefMatch[1]})` : bold;
  });
  s = s.replace(/<b>([\s\S]*?)<\/b>/g, (_m, inner) => `**${inner.trim()}**`);
  // 사이트 내부 상대링크([글자](/ko/...))는 앱 안에서 그대로 열 수 없다 — 절대 URL로 바꾼다.
  s = s.replace(/\]\((\/[^)]+)\)/g, (_m, relPath) => `](${SITE_ORIGIN}${relPath})`);
  s = s.replace(/\n{3,}/g, '\n\n').trim();
  return s;
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.heic' || ext === '.heif') return 'image/heic';
  return 'image/jpeg';
}

/** 앱이 커뮤니티 사진을 올릴 때 쓰는 같은 r2-upload 엣지함수 경로로 히어로 이미지를 올리고
 * 워커 공개 URL을 반환한다. 키는 slug 로 고정해 재실행해도 같은 오브젝트를 덮어쓴다. */
async function uploadHeroImage(localImagePath, slug, publishedAt) {
  const yyyyMm = String(publishedAt).slice(0, 7); // 'YYYY-MM'
  const ext = path.extname(localImagePath).toLowerCase().replace('.', '') || 'jpg';
  const key = `parkinon/community/${BOT_USER_ID}/${yyyyMm}/${slug}.${ext}`;
  const contentType = contentTypeFor(localImagePath);

  const { data: invokeData, error: invokeError } = await supabase.functions.invoke('r2-upload', {
    body: { key, contentType },
  });
  if (invokeError) throw new Error(`r2-upload invoke 실패(${slug}): ${invokeError.message}`);

  const bytes = fs.readFileSync(localImagePath);
  const putRes = await fetch(invokeData.presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: bytes,
  });
  if (!putRes.ok) throw new Error(`R2 PUT 실패(${slug}): ${putRes.status}`);

  return { key, publicUrl: invokeData.publicUrl };
}

async function upsertPost({ slug, title, content, newsUrl }) {
  const { data: existing } = await supabase
    .from('posts')
    .select('id')
    .eq('news_url', newsUrl)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('posts')
      .update({ title, content, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) throw new Error(`posts update 실패(${slug}): ${error.message}`);
    return { id: existing.id, created: false };
  }

  const { data: inserted, error } = await supabase
    .from('posts')
    .insert({
      author_id: BOT_USER_ID,
      post_type: 'info',
      title,
      content,
      is_news: true,
      news_url: newsUrl,
      author_name_override: '파킨온',
      hidden: false,
      is_notice: false,
    })
    .select('id')
    .single();
  if (error) throw new Error(`posts insert 실패(${slug}): ${error.message}`);
  return { id: inserted.id, created: true };
}

async function upsertPostMedia(postId, r2Key, r2Url) {
  const { data: existing } = await supabase
    .from('post_media')
    .select('id')
    .eq('post_id', postId)
    .eq('media_type', 'image')
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('post_media').update({ r2_key: r2Key, r2_url: r2Url }).eq('id', existing.id);
    if (error) throw new Error(`post_media update 실패: ${error.message}`);
    return;
  }
  const { error } = await supabase
    .from('post_media')
    .insert({ post_id: postId, r2_key: r2Key, r2_url: r2Url, sort_order: 0, media_type: 'image' });
  if (error) throw new Error(`post_media insert 실패: ${error.message}`);
}

async function main() {
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: BOT_EMAIL,
    password: NEWS_BOT_PASSWORD,
  });
  if (signInError) {
    console.error('파킨온 봇 계정 로그인 실패:', signInError.message);
    process.exit(1);
  }

  const files = fs.readdirSync(NEWS_DIR).filter((f) => f.endsWith('.mdx'));
  console.log(`소식 글 ${files.length}건 동기화 시작`);

  for (const file of files) {
    const slug = file.replace(/\.mdx$/, '');
    const filePath = path.join(NEWS_DIR, file);
    const raw = fs.readFileSync(filePath, 'utf8');
    const { data: fm, content: body } = matter(raw);

    const newsUrl = `${SITE_ORIGIN}/ko/news/${slug}`;
    const plainBody = mdxBodyToPlainMarkdown(body);

    const { id: postId, created } = await upsertPost({
      slug,
      title: fm.title,
      content: plainBody,
      newsUrl,
    });

    if (fm.hero) {
      const heroPath = path.resolve(path.dirname(filePath), fm.hero);
      if (fs.existsSync(heroPath)) {
        // gray-matter(js-yaml)는 `publishedAt: 2026-08-09` 같은 값을 Date 객체로 파싱한다 —
        // String(date)는 "Sat Aug 09 2026..." 꼴이라 그대로 쓰면 안 되고 toISOString()으로 뽑는다.
        const publishedDate = fm.publishedAt instanceof Date
          ? fm.publishedAt.toISOString().slice(0, 10)
          : String(fm.publishedAt ?? '').slice(0, 10);
        const { key: r2Key, publicUrl: r2Url } = await uploadHeroImage(heroPath, slug, publishedDate || '2026-01-01');
        await upsertPostMedia(postId, r2Key, r2Url);
      } else {
        console.warn(`  ⚠ 히어로 이미지 없음(건너뜀): ${heroPath}`);
      }
    }

    console.log(`  ${created ? '생성' : '갱신'}: ${slug} → post id ${postId}`);
  }

  console.log('동기화 완료');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
