/*
 * 파킨온 소식 글의 "하단 앱 추천" 화면을 글 내용에 맞게 자동으로 정한다.
 *
 * 왜 필요한가(2026-08-12 오너 지시): 소식이 이틀에 한 번꼴로 올라오는데, 글마다
 * `appFeature` 를 손으로 넣다 보면 빠뜨리게 되고 그러면 전부 같은 화면(약복용 홈)으로
 * 나간다. 실제로 그렇게 14편이 같은 그림이던 것을 뒤늦게 고쳤다.
 *
 * 규칙은 세 가지다.
 *  1) **번역본은 한국어 원본의 값을 물려받는다.** 같은 글이면 주제가 같고, 한국어 값은
 *     오너가 직접 보고 승인한 것이다(2026-08-12, 14편). 번역본을 키워드로 다시 판정하면
 *     같은 글인데 언어마다 다른 화면이 나간다 — 실제로 대조해 보니 11편이 갈렸다.
 *     그 언어판 앱에 없는 기능(해외판 커뮤니티)은 물려받지 않고 떨어뜨린다.
 *  2) 물려받을 원본이 없으면(한국어 원본이 비었거나, 그 언어 전용 글이면)
 *     제목·설명·요약에서 주제를 찾아 기능을 고른다(아래 RULES, 위에서부터 먼저 맞는 것).
 *  3) **애매하면 아무것도 넣지 않는다.** 안 맞는 화면을 붙이는 게 같은 화면보다 나쁘다
 *     — 이건 오너가 정한 기준이다. 기본 화면(약복용 홈)이 나가도 괜찮은 글들이 있다.
 *
 * 언어별로 쓸 수 있는 기능이 다르다(src/lib/appShots.ts 가 정본). 이 스크립트는
 * 그 제약을 그대로 반영한다 — 예: 해외 앱에는 커뮤니티가 없어 en·ja·fr 에는 절대 안 붙인다.
 *
 * 사용법:
 *   node scripts/set-news-app-feature.mjs            # 비어 있는 소식 글에 채워 넣는다
 *   node scripts/set-news-app-feature.mjs --check    # 고치지 않고 검사만(빠진 것 보고)
 *   node scripts/set-news-app-feature.mjs --all      # 소식뿐 아니라 전체 카테고리 대상
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ARTICLES = path.join(ROOT, 'src/content/articles');

/** 그 언어판 앱에 기능 자체가 없는 항목 — src/lib/appShots.ts 의 unavailable 과 같아야 한다. */
const UNAVAILABLE = {
  en: ['community'],
  ja: ['community'],
  fr: ['community'],
};

/*
 * 주제 → 앱 기능. 위에서부터 먼저 맞는 것을 쓴다.
 * 키워드는 **한국어·영어·일본어를 함께** 넣어 번역본에도 같은 규칙이 적용되게 한다.
 * 소식 글이 이틀에 한 번 올라오고 그때마다 네 언어로 번역되므로, 언어를 빼먹으면
 * 그 언어판만 조용히 기본 화면(홈)으로 나간다.
 *
 * ⚠️ 검사 대상은 **제목·설명·세 줄 요약뿐**이다. 본문까지 훑으면 용어 툴팁(<Term brief>)에
 *    들어 있는 무관한 의학 설명이 걸린다 — 실제로 세포치료·신약 글이 "sleep" 에 걸렸다.
 * ⚠️ 한국어 "운동"은 **운동 증상(motor symptoms)** 을 뜻하는 경우가 훨씬 많다.
 *    그래서 단독 "운동"은 쓰지 않고, 신체활동을 가리키는 표현만 넣는다.
 *    일본어도 똑같은 함정이 있다 — `運動症状`·`非運動症状` 이 흔해서 단독 `運動` 은 쓰지 않고
 *    조사가 붙은 형태(`運動を`·`運動が`…)만 쓴다. `運動症状が` 안에는 `運動が` 가 없으므로 안전하다.
 */
const RULES = [
  {
    feature: 'exercise',
    why: '운동 이야기',
    kw: ['유산소', '걷기', '운동을', '운동이', '운동 기록', '재활',
         'exercise', 'physical activity', 'walking', 'rehabilitation',
         '有酸素', '運動を', '運動が', '運動した', '運動する', '運動習慣',
         'ウォーキング', '歩く', 'リハビリ'],
  },
  {
    feature: 'effectTracking',
    why: '증상·기분·수면 등 몸상태 기록과 연결',
    kw: [
      '우울', '무기력', '무감동', '기분', '수면', '몸상태', '비운동 증상', '삶의 질',
      'depression', 'apathy', 'mood', 'sleep', 'non-motor', 'quality of life',
      '抑うつ', 'うつ症状', '気分', 'アパシー', '意欲の低下', '睡眠', '体調',
      '非運動症状', '生活の質',
    ],
  },
  {
    feature: 'reminder',
    why: '복약 시간·순응도 이야기',
    kw: ['복약 시간', '복용 시간', '알림', '순응', 'adherence', 'dosing schedule', 'reminder',
         // 일본어: `通知`·`お知らせ` 는 너무 흔해서(사이트 UI 문구와도 겹친다) 일부러 뺐다.
         '服薬の時間', '服薬時間', '飲む時間', 'アドヒアランス', '服薬管理'],
  },
  {
    feature: 'medRegistration',
    why: '복용 중인 약을 등록·정리하는 것과 연결',
    kw: ['처방', '복용약 목록', '약 목록', 'prescription', 'medication list',
         '処方', 'お薬の一覧', '薬の一覧', '服薬リスト'],
  },
  {
    feature: 'record',
    why: '진료·기록 이야기',
    kw: ['진료', '외래', '병원 방문', '검사 결과', 'clinic visit', 'medical visit', 'appointment',
         '受診', '外来', '通院', '検査結果', '診察'],
  },
  {
    feature: 'family',
    why: '가족·보호자 이야기',
    kw: ['보호자', '가족이', '돌봄', 'care partner', 'caregiving', 'family member',
         // 일본어: 상투구 「患者さんとご家族の視点で」 를 아래 BOILERPLATE 로 먼저 지운 뒤에도
         // 남는 것만 잡도록 조사가 붙은 형태를 쓴다. 단독 `ご家族` 는 위험하다.
         'ご家族が', 'ご家族と', '家族が', '介護'],
  },
];

const args = process.argv.slice(2);
const CHECK_ONLY = args.includes('--check');
const ALL_CATEGORIES = args.includes('--all');

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (/\.mdx?$/.test(e.name)) out.push(p);
  }
  return out;
}

/*
 * 소식 글 설명문에 늘 들어가는 상투구 — 주제가 아니므로 매칭에서 뺀다.
 * 이게 없으면 모든 소식이 "보호자"에 걸려 family 로 잘못 잡힌다(실제로 그랬다).
 */
const BOILERPLATE = [
  '환자분·보호자분 관점에서',
  '환자분과 보호자분',
  '환자와 가족',
  'for people with parkinson’s and their care partners',
  "for people with parkinson's and their care partners",
  'people with parkinson’s and their care partners',
  "people with parkinson's and their care partners",
  'for you and your care partner',
  'you and your care partner',
  // 일본어 소식 글의 설명문에 매번 들어간다. 이걸 지우지 않으면 `介護`·`ご家族と` 에 걸려
  // 모든 일본어 소식이 family 로 잘못 잡힌다(한국어에서 똑같이 겪었다).
  '患者さんとご家族の視点で',
  '患者さんとご家族',
];

/** 제목·설명·요약만 뽑는다. 본문·툴팁은 오탐의 원인이라 보지 않는다. */
function subjectOf(raw) {
  const fm = raw.split('---')[1] ?? '';
  const keep = [];
  let inSummary = false;
  for (const line of fm.split('\n')) {
    if (/^(title|description|tag):/.test(line)) { keep.push(line); inSummary = false; continue; }
    if (/^summary:/.test(line)) { inSummary = true; continue; }
    if (inSummary) {
      if (/^\s+-\s/.test(line)) { keep.push(line); continue; }
      if (/^\S/.test(line)) inSummary = false;
    }
  }
  let out = keep.join('\n').toLowerCase();
  for (const b of BOILERPLATE) out = out.split(b.toLowerCase()).join(' ');
  return out;
}

function pick(text, locale) {
  const hay = subjectOf(text);
  const blocked = UNAVAILABLE[locale] ?? [];
  for (const rule of RULES) {
    if (blocked.includes(rule.feature)) continue;
    const hit = rule.kw.find((k) => hay.includes(k.toLowerCase()));
    if (hit) return { ...rule, hit };
  }
  return null;
}

/*
 * 한국어 원본에서 물려받는다. 같은 글의 판단이 언어마다 갈리지 않게 하는 것이 목적이다.
 * 원본이 비어 있으면 null 을 돌려주고, 그때만 키워드 판정으로 내려간다.
 * 그 언어판 앱에 기능이 없으면(해외판 `community`) 물려받지 않는다 — 없는 기능을 광고하면 안 된다.
 */
async function inherit(rel, locale) {
  if (locale === 'ko') return null;
  const koFile = path.join(ARTICLES, 'ko', rel.split(path.sep).slice(1).join(path.sep));
  let koRaw;
  try {
    koRaw = await readFile(koFile, 'utf8');
  } catch {
    return null; // 그 언어 전용 글(일본 제도 글 등) — 원본이 없다
  }
  const m = koRaw.match(/^appFeature:\s*(\S+)/m);
  if (!m) return null;
  const feature = m[1];
  if ((UNAVAILABLE[locale] ?? []).includes(feature)) {
    return { blocked: feature };
  }
  return { feature, why: '한국어 원본에서 물려받음', hit: 'ko' };
}

const files = (await walk(ARTICLES)).filter((f) => {
  const rel = path.relative(ARTICLES, f);
  return ALL_CATEGORIES || rel.includes(`${path.sep}news${path.sep}`);
});

let filled = 0;
let skipped = 0;
const missing = [];

for (const file of files) {
  const rel = path.relative(ARTICLES, file);
  const locale = rel.split(path.sep)[0];
  const raw = await readFile(file, 'utf8');

  if (/^appFeature:/m.test(raw)) continue; // 이미 정해져 있으면 손대지 않는다

  const handed = await inherit(rel, locale);
  if (handed?.blocked) {
    // 원본은 값이 있지만 이 언어판 앱에는 그 기능이 없다. 기본 화면으로 두는 게 맞다.
    console.log(`  · ${rel}: 원본의 ${handed.blocked} 은 이 언어판 앱에 없어 물려받지 않음 → 기본 화면`);
    skipped += 1;
    continue;
  }
  const chosen = handed ?? pick(raw, locale);
  if (!chosen) {
    // 애매하면 비워 둔다 — 기본 화면으로 나가는 게 맞는 글이다.
    skipped += 1;
    missing.push(rel);
    continue;
  }

  if (CHECK_ONLY) {
    console.log(`  [빠짐] ${rel} → ${chosen.feature} 로 채울 수 있음 ("${chosen.hit}")`);
    filled += 1;
    continue;
  }

  // frontmatter 안, related/hashtags 앞에 넣는다.
  const anchor = /^related:/m.test(raw) ? /^(related:)/m : /^(hashtags:)/m;
  if (!anchor.test(raw)) {
    console.warn(`  ⚠️ ${rel}: related/hashtags 를 못 찾아 건너뜀`);
    continue;
  }
  await writeFile(file, raw.replace(anchor, `appFeature: ${chosen.feature}\n$1`), 'utf8');
  console.log(`  ${chosen.feature.padEnd(15)} ← ${rel}  (${chosen.why}: "${chosen.hit}")`);
  filled += 1;
}

console.log(
  `\n앱 추천 화면: ${CHECK_ONLY ? '채울 수 있는 글' : '새로 지정'} ${filled}편 · ` +
    `기본 화면 유지 ${skipped}편`
);
if (skipped) {
  console.log('기본 화면으로 두는 글(주제가 특정 기능과 무관 — 억지로 붙이지 않는다):');
  for (const m of missing) console.log(`  · ${m}`);
}
