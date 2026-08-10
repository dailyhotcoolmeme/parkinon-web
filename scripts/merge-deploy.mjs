#!/usr/bin/env node
/*
 * 정식 오픈용 통합 배포 빌드.
 *
 * 콘텐츠 사이트(site/, Astro)가 루트를 맡고, 기존 앱(SPA, 이 저장소 루트)은 /app/ 로
 * 옮긴다(website-plan.md "parkinon.com/app/… → 기존 기록보기"). Cloudflare Pages 프로젝트
 * 하나(`parkinon-web`, parkinon.com 연결됨)에 두 빌드를 합쳐서 올리기 위한 스크립트다.
 *
 * ⚠️ 이 스크립트는 merged-dist/ 를 만들 뿐, 배포는 하지 않는다. 배포는 별도 명령으로 —
 *    실제 프로덕션(parkinon.com)에 올리는 건 되돌리기 번거로운 일이라 항상 오너 확인 후 실행한다.
 *
 * 만든 이유(2026-08-10):
 * - SPA 빌드(base:'/app/')는 아이콘·폰트를 `dist/` 루트에 그대로 두고 index.html 에서만
 *   `/app/아이콘.svg` 로 참조한다(Vite 의 `base` 는 URL 만 바꾸고 public/ 복사 위치는 안 바꿈).
 *   그래서 SPA 빌드 전체를 `/app/` 아래로 통째로 복사해야 아이콘 경로가 실제로 맞는다.
 * - 반대로 `/terms` `/privacy` `/delete-account` `/app-ads.txt` 는 **루트 그대로 유지해야
 *   한다** — 스토어 등록 정보(Apple/Google 개인정보처리방침 URL)와 AdMob app-ads.txt 인증이
 *   이 정확한 루트 경로를 보고 있어서, 옮기면 오너가 스토어 콘솔을 따로 고쳐야 한다.
 * - `/about` 은 예외 — 옛 앱 소개 페이지였는데, 이제 그 역할을 콘텐츠 사이트 홈이 대신하므로
 *   가져오지 않는다. Astro 쪽 `_redirects` 에 이미 `/about → /ko/ 302` 규칙이 있다.
 * - `_headers`/`_redirects`/`_routes.json` 은 배포 **루트**에 있어야만 Cloudflare Pages 가
 *   읽는다 — `/app/` 밑에 있으면 조용히 무시된다. 그래서 이 세 개는 손으로 합친다.
 */
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const SPA_DIST = path.join(ROOT, 'dist');
const ASTRO_DIST = path.join(ROOT, 'site', 'dist');
const OUT = path.join(ROOT, 'merged-dist');

function run(cmd, cwd, env) {
  console.log(`\n▶ ${cmd}  (${path.relative(ROOT, cwd) || '.'})`);
  execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, ...env } });
}

console.log('=== 1/4: SPA(앱) 빌드 ===');
run('npm run build', ROOT);

/*
 * ⚠️ PUBLIC_SITE_URL 을 반드시 여기서 명시한다 — 이걸 빼먹으면 astro.config.mjs 가
 * 기본값(parkinon-site-dev.pages.dev)으로 빌드해서, 실제로는 parkinon.com에 올라가
 * 있어도 robots.txt·sitemap·meta robots 가 전부 "색인 금지"로 나간다(2026-08-10 사고 —
 * 정식 오픈 첫 배포가 이 사고로 며칠 동안 검색에 하나도 안 잡히고 있었다).
 */
console.log('\n=== 2/4: 콘텐츠 사이트(Astro) 빌드 ===');
run('npm run build', path.join(ROOT, 'site'), { PUBLIC_SITE_URL: 'https://parkinon.com' });

console.log('\n=== 3/4: 출력 합치기 ===');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// Astro 가 루트를 맡는다.
cpSync(ASTRO_DIST, OUT, { recursive: true });

// SPA 전체를 /app/ 아래로 — 아이콘·폰트가 index.html 의 /app/ 참조와 맞아야 한다.
cpSync(SPA_DIST, path.join(OUT, 'app'), { recursive: true });

/*
 * SPA 클라이언트 라우팅 폴백용 사본을 `/app/` 바깥에 따로 둔다 — 실측(2026-08-10):
 * `/app/*` 의 목적지가 `/app/` 아래 어디든(하위 폴더로 옮겨도, 파일명을 바꿔도) 있으면
 * Cloudflare 가 "그 목적지도 다시 /app/* 에 걸린다"고 보고 무한 루프로 오판해 규칙 자체를
 * 무시한다(cloudflare/workers-sdk#11824). 목적지를 `/app/` 밖(`/_app-fallback/`)에 둬야
 * 이 오탐을 완전히 피한다. 이름은 `index.html`을 쓴다 — 이래야 확장자 제거가 아니라
 * 트레일링 슬래시 쪽으로만 정규화되어 정상 종료된다(`/terms → /terms/`와 같은 원리).
 */
mkdirSync(path.join(OUT, '_app-fallback'), { recursive: true });
cpSync(path.join(OUT, 'app', 'index.html'), path.join(OUT, '_app-fallback', 'index.html'));

// 스토어·AdMob 이 보고 있는 정확한 루트 경로는 그대로 유지한다(옮기면 오너가 스토어 콘솔을
// 따로 고쳐야 함 — 이 마이그레이션의 목적이 아니다).
for (const name of ['terms', 'privacy', 'delete-account', 'app-ads.txt']) {
  const from = path.join(SPA_DIST, name);
  if (existsSync(from)) cpSync(from, path.join(OUT, name), { recursive: true });
}

// 폰트 캐시 규칙은 SPA 쪽 것을 그대로 쓴다(Astro 는 자체 _headers 가 없다).
cpSync(path.join(SPA_DIST, '_headers'), path.join(OUT, '_headers'));

// Pages Functions 를 /api/* 로만 한정한다(SPA 쪽 설정 그대로 — Astro 는 Functions 를 안 씀).
cpSync(path.join(SPA_DIST, '_routes.json'), path.join(OUT, '_routes.json'));

// _redirects: Astro 가 만든 것(루트게이트·언어 접두사·about→홈)이 기본이고,
// SPA 전용 규칙(법적 페이지·app-ads.txt·옛 앱 주소 호환·SPA 라우팅 폴백)을 뒤에 덧붙인다.
// 서로 겹치는 경로가 없어 순서는 상관없지만, 읽기 좋게 뒤에 둔다.
const astroRedirects = readFileSync(path.join(ASTRO_DIST, '_redirects'), 'utf8');
const spaRedirects = `
# ── 여기부터 앱(SPA, /app/) 전용 규칙 — merge-deploy.mjs 가 자동으로 합침 ──

# 법적 페이지 — 스토어 등록 주소라 경로를 바꾸면 안 된다(루트 그대로 유지)
/terms      /terms/index.html      200
/privacy    /privacy/index.html    200
/delete-account    /delete-account/index.html    200
/terms/en   /terms/en/index.html   200
/privacy/en /privacy/en/index.html 200
/delete-account/en /delete-account/en/index.html 200
/terms/fr /terms/fr/index.html 200
/terms/ja /terms/ja/index.html 200
/privacy/fr /privacy/fr/index.html 200
/privacy/ja /privacy/ja/index.html 200
/delete-account/fr /delete-account/fr/index.html 200
/delete-account/ja /delete-account/ja/index.html 200

# AdMob 앱 인증용. 아래 SPA 폴백보다 먼저 잡혀야 실제 파일이 나간다.
/app-ads.txt /app-ads.txt 200

# 정식 오픈 전(앱이 루트였을 때) 주소로 들어오는 경우 — 새 /app/ 주소로 넘긴다.
# 앱이 만든 딥링크(초대 토큰 등)나 기존 즐겨찾기가 계속 동작하게 하기 위함(2026-08-10).
/r/*        /app/r/:splat        301
/records    /app/records         301
/records/*  /app/records/:splat  301
/admin      /app/admin           301

# 앱(SPA) 클라이언트 라우팅 폴백 — /app/ 아래 나머지는 SPA 의 index.html 로 넘겨
# React Router 가 처리하게 한다. 실제 파일(정적 자산)이 있으면 Pages 가 이 규칙보다
# 먼저 그 파일을 서빙하므로 JS·CSS·아이콘은 영향받지 않는다.
# ⚠️ 목적지가 /app/ 아래 있으면 무한 루프로 오판된다 — /app/ 밖의 사본으로 넘긴다
#    (위 merge-deploy.mjs 스크립트 주석 참고).
/app/*      /_app-fallback/index.html      200
`;
writeFileSync(path.join(OUT, '_redirects'), astroRedirects + spaRedirects);

console.log(`\n=== 4/4: 완료 — ${path.relative(ROOT, OUT)} ===`);
console.log('배포 전 반드시 이 산출물을 미리보기로 먼저 검증할 것.');
