/*
 * 운동 영상 허브 상단의 "이 영상이 왜 믿을 만한가" 안내 — 타입만 여기 둔다.
 * 나라마다 인용할 기관·연구가 완전히 다르므로 언어별 데이터 파일(`exerciseSource.<언어>.ts`)로
 * 둔다. 화면(`ExerciseSourceNote.astro`)은 이 데이터만 받아 그린다.
 */

export interface ExerciseStat {
  value: string;
  label: string;
}

export interface ExerciseSource {
  /** 맨 위 작은 표시. 과장하지 않는다 — "공식 인증"이 아니라 실제 한 것만 적는다 */
  badge: string;
  /** 기관명 한 줄 */
  org: string;
  /** 수치로 보여줄 근거 (있는 경우만). 없으면 문단 없이 기관명 → 출처만 나온다 */
  stats?: ExerciseStat[];
  /** 출처 표기 — 보도자료·연구책임자 등 */
  citation: string;
  /** 원문·공식 홈페이지 링크 (없으면 생략 가능) */
  link?: { href: string; label: string };
  /** 상담 유도 문구 — 모든 언어에 필수 */
  disclaimer: string;
}
