/*
 * "용어사전에 항목이 있는 말이 본문에 맨 텍스트로 나오는가" 를 찾아내는 공용 로직.
 *
 * check-glossary-terms.mjs(빌드 게이트)와 guard.mjs(훅) 둘 다 여기를 쓴다 — 두 곳에
 * 같은 판정을 따로 적어 두면 반드시 갈라진다.
 *
 * ⚠️ 처음엔 "용어 문자열이 본문에 들어 있으면 위반"으로 짰다가 오탐이 쏟아졌다
 * (2026-08-15, 94건 중 상당수). 실제로 걸러야 했던 것들:
 *   ① 마크다운 링크로 이미 연결돼 있음 — `[용어](/ja/lifestyle/glossary/#앵커)`
 *   ② Term 라벨이 더 긴 경우 — `<Term …>ドパミンアゴニスト(dopamine agonist)</Term>`
 *      안에 `ドパミンアゴニスト` 가 들어 있는데 라벨이 정확히 일치하지 않는다고 놓침
 *   ③ 더 긴 단어의 일부 — `小児慢性特定疾病` 안의 `特定疾病`
 *   ④ 제목(`## タンパク質再配分食とは`)·frontmatter — 여기엔 컴포넌트를 못 쓴다
 *   ⑤ 코드블록·이미지 alt·컴포넌트 prop 문자열(Steps/Checklist 의 body) — JSX 문자열
 *      안에서는 <Term> 을 쓸 수 없다
 */

/** 용어사전 mdx 에서 "용어 이름" 목록을 뽑는다. */
export function vocabulary(src) {
  const out = [];
  for (const line of src.split('\n')) {
    const h3 = line.match(/^### (.+)$/);
    if (h3) {
      out.push(h3[1].trim());
      continue;
    }
    const h2 = line.match(/^## (.+)$/);
    if (!h2) continue;
    const t = h2[1].trim();
    if (/(よく出てくる言葉|窓口の名前|words that come up|나오는 말)/i.test(t)) continue;
    out.push(
      t
        .replace(/(とは何ですか|はどう違いますか|とは)\s*$/, '')
        .replace(/(가 뭔가요|이 뭔가요|은 뭔가요|는 뭔가요|은 어떻게 다른가요|는 어떻게 다른가요)\s*$/, '')
        .replace(/^(What is|What are|What do)\s+/i, '')
        .trim()
    );
  }
  return [...new Set(out)].filter((t) => t.length >= 4);
}

/** 본문에서 "검사 대상이 아닌 곳"을 지운다. 지운 자리는 같은 길이의 공백으로 바꿔 위치를 보존한다. */
export function scannable(source) {
  let s = source.replace(/^---[\s\S]*?\n---\n/, (m) => ' '.repeat(m.length));
  const blank = (m) => ' '.repeat(m.length);
  s = s.replace(/```[\s\S]*?```/g, blank); // 코드블록
  s = s.replace(/^import .*$/gm, blank); // import 문
  s = s.replace(/^#{1,6} .*$/gm, blank); // 제목 — 컴포넌트를 못 쓴다
  s = s.replace(/<Term[\s\S]*?<\/Term>/g, blank); // 이미 감싼 것(속성 포함)
  s = s.replace(/\[[^\]]*\]\([^)]*glossary\/#[^)]*\)/g, blank); // 마크다운 용어사전 링크
  s = s.replace(/<(Steps|Checklist|CompareBar|Callout|SourceQuote|AppPromo)\b[\s\S]*?\/>/g, blank); // JSX prop 문자열
  s = s.replace(/alt="[^"]*"/g, blank);
  return s;
}

/**
 * 한 글에서 "연결이 빠진 용어" 목록을 돌려준다.
 * @param {string} source  글 mdx 원문
 * @param {string[]} vocab 그 언어의 용어사전 용어 목록
 */
export function missingTerms(source, vocab) {
  const wrappedLabels = [...source.matchAll(/<Term[^>]*>([^<]*)<\/Term>/g)].map((m) => m[1].trim());
  const linkedAnchors = new Set([
    ...[...source.matchAll(/href="\/[a-z]{2}\/lifestyle\/glossary\/#([^"]+)"/g)].map((m) => decodeURIComponent(m[1])),
    ...[...source.matchAll(/\]\(\/[a-z]{2}\/lifestyle\/glossary\/#([^)]+)\)/g)].map((m) => decodeURIComponent(m[1])),
  ]);
  const anchorText = [...linkedAnchors].join(' ');
  const text = scannable(source);
  const longer = (t) => vocab.filter((v) => v !== t && v.includes(t));

  return vocab.filter((t) => {
    // 이미 이 글에서 Term 으로 감쌌는가 — 라벨이 더 길어도(예: "X(english)") 인정한다
    if (wrappedLabels.some((label) => label === t || label.includes(t))) return false;
    // 이미 용어사전 앵커로 링크했는가(HTML·마크다운 둘 다)
    if (anchorText.includes(t.replace(/[()・·\s]/g, ''))) return false;
    let idx = text.indexOf(t);
    while (idx !== -1) {
      // 더 긴 용어사전 용어의 일부라면 이 자리는 넘어간다
      const around = text.slice(Math.max(0, idx - 12), idx + t.length + 12);
      if (longer(t).some((v) => around.includes(v))) {
        idx = text.indexOf(t, idx + 1);
        continue;
      }
      /*
       * 한자가 바로 앞뒤에 붙어 있으면 더 긴 복합어의 일부다 — 용어사전에 없는 말이라
       * 위의 검사로는 못 걸러진다. 실제 사례: `小児慢性特定疾病医療費` 안의 `特定疾病`
       * (2026-08-15). 조사(の·は·を…)나 기호가 붙는 정상적인 경우는 가나·구두점이라 통과한다.
       */
      const KANJI = /\p{Script=Han}/u;
      const before = idx > 0 ? text[idx - 1] : '';
      const after = text[idx + t.length] ?? '';
      if (KANJI.test(t[0]) && KANJI.test(before)) {
        idx = text.indexOf(t, idx + 1);
        continue;
      }
      if (KANJI.test(t[t.length - 1]) && KANJI.test(after)) {
        idx = text.indexOf(t, idx + 1);
        continue;
      }
      return true;
    }
    return false;
  });
}

/**
 * 그 용어를 <Term> 으로 감쌀 **첫 번째 유효한 위치**를 돌려준다(없으면 -1).
 * missingTerms 와 같은 건너뛰기 규칙(복합어 안·이미 감싼 곳 등)을 쓴다 — 판정과 수정이
 * 서로 다른 자리를 보면 안 된다.
 */
export function firstPlainIndex(source, term, vocab) {
  const text = scannable(source);
  const longer = vocab.filter((v) => v !== term && v.includes(term));
  const KANJI = /\p{Script=Han}/u;
  let idx = text.indexOf(term);
  while (idx !== -1) {
    const around = text.slice(Math.max(0, idx - 12), idx + term.length + 12);
    const before = idx > 0 ? text[idx - 1] : '';
    const after = text[idx + term.length] ?? '';
    const skip =
      longer.some((v) => around.includes(v)) ||
      (KANJI.test(term[0]) && KANJI.test(before)) ||
      (KANJI.test(term[term.length - 1]) && KANJI.test(after));
    if (!skip) return idx;
    idx = text.indexOf(term, idx + 1);
  }
  return -1;
}
