/*
 * 대문(언어 선택)에 나오는 언어 목록.
 *
 * ⚠️ **실제로 페이지가 있는 언어만** 넣는다. 없는 언어를 넣으면 404 로 이어진다.
 * 언어판을 새로 열 때 여기에 한 줄을 더한다 — 그러면 대문에 자동으로 나타난다.
 *
 * 한 줄 소개는 **그 언어로** 적는다. 대문에서 문구를 한 언어로만 쓰면
 * 다른 언어 사용자에게는 여전히 남의 집 문이다.
 */
export interface GateLanguage {
  code: string;
  /** 그 언어 사용자가 자기 언어를 알아볼 수 있게, 자기 언어 이름 그대로 적는다 */
  name: string;
  tagline: string;
  href: string;
}

/* i18n-exempt:start — 여기 글자들은 **번역 대상이 아니라 그 반대**다.
   대문은 언어를 고르는 곳이라 각 줄이 항상 자기 언어로 나와야 한다.
   사전을 거치면 영어로 폴백될 수 있는데, 그러면 한국어 줄이 영어로 바뀌어 고를 수가 없다. */
export const GATE_LANGUAGES: GateLanguage[] = [
  {
    code: 'ko',
    name: '한국어',
    tagline: '파킨슨병과 함께하는 하루하루, 조금 더 수월하게',
    href: '/ko/',
  },
  {
    code: 'en',
    name: 'English',
    tagline: 'Making each day with Parkinson’s a little easier',
    href: '/en/',
  },
  {
    code: 'ja',
    name: '日本語',
    tagline: 'パーキンソン病とともに過ごす毎日を、少しでも楽に',
    href: '/ja/',
  },
  {
    code: 'fr',
    name: 'Français',
    tagline: 'Rendre chaque jour avec la maladie de Parkinson un peu plus facile',
    href: '/fr/',
  },
  {
    code: 'es',
    name: 'Español',
    tagline: 'Para que cada día con la enfermedad de Parkinson sea un poco más llevadero',
    href: '/es/',
  },
  {
    code: 'pt',
    name: 'Português',
    tagline: 'Para tornar cada dia com a doença de Parkinson um pouco mais leve',
    href: '/pt/',
  },
];
/* i18n-exempt:end */
