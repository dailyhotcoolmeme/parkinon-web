/*
 * 운동 영상 허브 상단의 "이 영상이 왜 믿을 만한가" 안내 — 타입만 여기 둔다.
 * 나라마다 인용할 기관·연구가 완전히 다르므로 언어별 데이터 파일(`exerciseSource.<언어>.ts`)로
 * 둔다. 화면(`ExerciseSourceNote.astro`)은 이 데이터만 받아 그린다.
 *
 * ⚠️ 화면은 **텍스트 세 문단**이다(오너 확정 2026-08-07). 아이콘·배지·숫자 카드 같은
 * 새 시각 요소를 넣지 말 것 — "깔끔하게"는 간격·타이포 정리를 뜻했지 재설계를 뜻한 게 아니었다.
 */

/** 문장 중 굵게 강조할 부분을 배열로 쪼갠다 — 언어마다 어순이 달라도 구조가 깨지지 않는다. */
export interface TextRun {
  text: string;
  bold?: boolean;
}

export interface ExerciseSource {
  /** 첫 문단 — "이 영상은 OO가 OO와 함께 만들었다" + 효과·검증 결과까지 한 문단으로 */
  intro: TextRun[];
  /** 출처 표기 한 줄 — 보도자료·연구책임자 등 */
  citation: string;
  /** 원문·공식 홈페이지 링크 (없으면 생략 가능) */
  link?: { href: string; label: string };
  /** 상담 유도 문구 — 모든 언어에 필수 */
  disclaimer: string;
}
