/*
 * 초록 문단 나누기.
 *
 * 일부 저널(NeuroImage 등)은 PubMed 에 초록을 BACKGROUND/METHODS 같은 절 라벨 없이
 * 통짜 한 덩어리로 낸다 — 원본 자체가 그렇다(2026-08-13 실측: PMID 42336304 의
 * `AbstractText` 는 라벨 없는 1개뿐이었다). **없는 구조를 지어내지 않는다** — 라벨을
 * 만들어 붙이는 대신, 읽기 편하게 문단만 나눈다(오너 결정 2026-08-13: "문단만 나누기").
 *
 * ⚠️ 라벨이 있는 절(BACKGROUND 등)도 안 안에서는 줄바꿈이 전혀 없이 긴 텍스트가
 * 한 덩어리였다(오너 지적 2026-08-13: "라벨있는 논문도 각 라벨 내부 텍스트가 줄바꿈이
 * 전혀 없더라고"). 그래서 **라벨 유무와 상관없이 항상** 이 함수를 거친다 — 라벨은
 * 그대로 두고, 그 라벨 밑 텍스트만 문단으로 나눈다.
 *
 * 서버(.astro)와 클라이언트(`<script>` 인라인 렌더 함수) 양쪽에서 같은 함수를 쓴다.
 * 한쪽만 고치면 최초 로드와 "더보기"/검색 결과의 모양이 달라진다.
 */

/** 문장 끝(.!?) 뒤 공백 다음이 대문자로 시작할 때만 자른다 — "e.g. is" 같은 약어 중간을 덜 끊는다. */
const SENTENCE_SPLIT = /(?<=[.!?])\s+(?=[A-Z])/;

export function paragraphizeAbstract(text: string, targetLen = 380): string[] {
  const clean = (text ?? '').trim();
  if (!clean) return [];
  const sentences = clean.split(SENTENCE_SPLIT);
  const paras: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if (cur && cur.length + s.length + 1 > targetLen) {
      paras.push(cur);
      cur = s;
    } else {
      cur = cur ? `${cur} ${s}` : s;
    }
  }
  if (cur) paras.push(cur);
  return paras.length ? paras : [clean];
}
