/*
 * 광고 존 정본. 화면에서 받은 ID 를 코드 여기저기 흩지 않기 위해 한 곳에 모은다.
 *
 * 두 네트워크를 쓴다.
 * - **한국어**: 카카오 애드핏 (`AdFitBanner.astro`, 단위 ID 는 각 페이지에 박혀 있다).
 *   국내 광고주 네트워크라 해외 언어에 띄워도 안 채워진다.
 * - **그 밖의 언어**: Adcash (`AdBanner.astro` + `Layout.astro` 의 부트스트랩).
 *   Publisher 1208684 · Website 1647146(parkinon.com, News). 2026-09-02 개설.
 *
 * ⚠️ **유럽(EEA·영국·스위스)에는 광고를 보내지 않는다.** 동의창(CMP)도 EU 대리인도 없기
 *    때문이다 — `docs/website-plan.md` "광고를 켜기 전에 대리인과 CMP가 있어야 한다".
 *    대리인을 두기로 하는 날 `AD_BLOCKED_COUNTRIES` 를 비우면 그대로 켜진다.
 */

/** Adcash 존 ID. 크기는 한국어(애드핏) 자리와 일부러 똑같이 맞췄다 — 같은 칸에 갈아 끼우려고. */
export const ACS_ZONE = {
  /** 300×250 — 모바일 본문 칸, 기사 본문 시작 직후·끝 */
  rect: '12091598',
  /** 728×90 — PC 목록 상단 */
  leaderboard: '12091606',
  /** 160×600 — PC 우측 세로 레일 */
  skyscraper: '12091614',
} as const;

export type AcsSize = keyof typeof ACS_ZONE;

/** Autotag(팝업언더·전면·인페이지푸시·비디오슬라이더 자동 순환). 수익 목표 $$$ 로 생성. */
export const ACS_AUTOTAG_ZONE = 'vbzjudlnvz';

/** 라이브러리. 존 종류와 무관하게 문서 하나당 한 번만 넣는다. */
export const ACS_LIB = '//acscdn.com/script/aclib.js';

/**
 * 광고를 아예 보내지 않는 나라.
 * EU 27 + EEA 3(IS·LI·NO) + 영국 + 스위스.
 * 스위스는 EEA 가 아니지만 별도로 동의창 대상이라 같이 뺀다(website-plan.md 4절).
 */
export const AD_BLOCKED_COUNTRIES = [
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT',
  'LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE',
  'IS','LI','NO',
  'GB','CH',
];
