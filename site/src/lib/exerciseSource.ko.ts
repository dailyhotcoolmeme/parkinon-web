import type { ExerciseSource } from './exerciseSource';

/* i18n-exempt:start — 근거·기관명은 번역 대상이 아니라 한국 전용 콘텐츠다. exerciseSource.ts 참고. */
export const EXERCISE_SOURCE: ExerciseSource = {
  intro: [
    { text: '질병관리청 국립보건연구원', bold: true },
    { text: '이 ' },
    { text: '대한파킨슨병및이상운동질환학회', bold: true },
    {
      text: '와 함께 개발한 비대면 운동 프로그램입니다. 임상연구에서 운동기능 지표(UPDRS)가 22%, 불안·우울 지표가 각각 31% 개선됐고 특별한 부작용은 확인되지 않았습니다.',
    },
  ],
  citation: '국립보건연구원 보도자료(2024-05-08) · 연구책임 조진환 교수(삼성서울병원 신경과)',
  link: { href: 'https://parkinson.co.kr/', label: 'parkinson.co.kr' },
  disclaimer: '현재 몸 상태에 맞는 운동인지는 담당 의사·물리치료사와 먼저 상의하세요.',
};
/* i18n-exempt:end */
