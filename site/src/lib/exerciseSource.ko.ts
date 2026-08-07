import type { ExerciseSource } from './exerciseSource';

/* i18n-exempt:start — 근거·기관명은 번역 대상이 아니라 한국 전용 콘텐츠다. exerciseSource.ts 참고. */
export const EXERCISE_SOURCE: ExerciseSource = {
  badge: '국가기관·학회 공동 검증',
  org: '질병관리청 국립보건연구원 · 대한파킨슨병및이상운동질환학회',
  stats: [
    { value: '22%', label: '운동기능 개선 (UPDRS)' },
    { value: '31%', label: '불안 감소' },
    { value: '31%', label: '우울 감소' },
  ],
  citation: '국립보건연구원 보도자료(2024-05-08) · 연구책임 조진환 교수(삼성서울병원 신경과)',
  link: { href: 'https://parkinson.co.kr/', label: 'parkinson.co.kr' },
  disclaimer: '현재 몸 상태에 맞는 운동인지는 담당 의사·물리치료사와 먼저 상의하세요.',
};
/* i18n-exempt:end */
