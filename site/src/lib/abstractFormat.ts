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
const SENTENCE_SPLIT_LATIN = /(?<=[.!?])\s+(?=[A-Z])/;
/*
 * 한글은 대소문자가 없어 위 규칙("다음 글자가 대문자")이 절대 걸리지 않는다 — 그 결과
 * 번역된 한국어 초록은 문장이 아무리 많아도 한 덩어리로 안 잘렸다(오너 지적 2026-08-16:
 * "번역된거에서 내용부분이 줄바꿈이 안되어있는거 같아"). 한글이 섞인 텍스트는 대문자
 * 조건 없이 문장부호 뒤 공백만으로 자른다.
 */
const SENTENCE_SPLIT_HANGUL = /(?<=[.!?])\s+/;
/*
 * 일본어는 한글 범위(HAS_HANGUL)에 전혀 안 걸려서 그대로 SENTENCE_SPLIT_LATIN(대문자
 * 다음에만 자름)으로 떨어졌다 — 일본어엔 대소문자가 없고, 문장이 반각 마침표(.)가 아니라
 * 전각 마침표(。)로 끝나며, 그 뒤에 공백도 없어 세 조건 다 안 맞았다. 결과적으로 분리
 * 지점을 하나도 못 찾아 번역된 일본어 초록이 통짜 한 덩어리로 나갔다(오너 지적
 * 2026-08-18). 전각 마침표・느낌표・물음표 뒤에서 곧바로 자른다(공백 유무와 무관).
 */
const SENTENCE_SPLIT_JAPANESE = /(?<=[。!?])/;
/* i18n-exempt:start — 문자 종류를 감지하는 정규식이지 화면 문구가 아니다. */
const HAS_HANGUL = /[가-힣]/;
/** 히라가나・가타카나・전각 마침표가 있으면 일본어로 본다(한자만으로는 한국어 한자어와 구분이 안 되므로 가나/전각 구두점을 기준으로 삼는다). */
const HAS_JAPANESE = /[ぁ-んァ-ヶ。]/;
/* i18n-exempt:end */

/*
 * 문장 하나 = 줄바꿈 하나(오너 지시 2026-08-16: "마침표 다음에 줄바꿈인데!!"). 여러
 * 문장을 글자수(targetLen)까지 한 문단으로 묶던 예전 로직을 없애고, 잘라낸 문장을
 * 그대로 한 줄씩 반환한다.
 */
export function paragraphizeAbstract(text: string): string[] {
  const clean = (text ?? '').trim();
  if (!clean) return [];
  const splitRegex = HAS_HANGUL.test(clean)
    ? SENTENCE_SPLIT_HANGUL
    : HAS_JAPANESE.test(clean)
      ? SENTENCE_SPLIT_JAPANESE
      : SENTENCE_SPLIT_LATIN;
  const sentences = clean
    .split(splitRegex)
    .map((s) => s.trim())
    .filter(Boolean);
  return sentences.length ? sentences : [clean];
}
