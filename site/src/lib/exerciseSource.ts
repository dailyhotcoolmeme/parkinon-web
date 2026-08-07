/*
 * 운동 영상 허브 상단의 "이 영상이 왜 믿을 만한가" 안내 — 타입만 여기 둔다.
 * 나라마다 인용할 기관·연구가 완전히 다르므로 언어별 데이터 파일(`exerciseSource.<언어>.ts`)로
 * 둔다. 화면(`ExerciseSourceNote.astro`)은 이 데이터만 받아 그린다.
 *
 * ⚠️ 화면은 **텍스트 세 문단**이고, 문단 전체에 박스를 씌우지 않는다(오너 확정 2026-08-07:
 * "중요한 부분만 배경색 박스 넣으라고!!"). 문단 안의 **핵심 수치에만** `highlight` 로
 * 작은 배경 칩을 준다. 그 외 문단·출처·상담 문구는 그대로 텍스트다.
 */

/** 문장의 한 조각. bold=굵게, highlight=작은 배경 칩(수치처럼 눈에 띄어야 할 부분에만). */
export interface TextRun {
  text: string;
  bold?: boolean;
  highlight?: boolean;
}

export interface ExerciseSource {
  /** 첫 문단 — 기관명(굵게) + 효과 수치(칩)까지 한 문단으로 */
  intro: TextRun[];
  /** 출처 표기 한 줄 — 보도자료·연구책임자 등 */
  citation: string;
  /** 원문·공식 홈페이지 링크 (없으면 생략 가능) */
  link?: { href: string; label: string };
  /** 상담 유도 문구 — 모든 언어에 필수 */
  disclaimer: string;
}
