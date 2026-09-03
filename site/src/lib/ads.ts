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

/*
 * 🚨 Autotag(`vbzjudlnvz`)는 2026-09-04에 껐다 — 절대 다시 켜지 마라.
 *
 * Autotag 가 묶어 도는 포맷(팝언더·전면·인페이지푸시) 중 하나가 본문 텍스트·링크
 * 위에 투명 오버레이(`<div znid=… z-index:2147483647>`)를 깔아서 **실제 클릭을
 * 통째로 삼켰다.** 재현: 제도 글 링크를 클릭 → 광고 탭만 열리고 원래 페이지는
 * 10초를 기다려도 이동하지 않음(오너 신고 "아무거나 눌러도 광고로 눌러진다").
 * 해외 5개 언어 전체에서 사실상 글을 못 읽는 상태였다.
 *
 * Adcash 공식 문서: 정상적인 Pop-Under 는 "opened **behind** the browser" —
 * 클릭을 막지 않는다. Autotag 가 자동으로 고르는 내부 구현이 이 정의를 어기고
 * 있었던 것이지, 팝언더 자체가 원래 이런 광고가 아니다.
 *
 * 대신 **전용 Pop-Under 존**을 새로 만들어 붙였다(아래 ACS_POPUNDER_ZONE) —
 * "I would like to manage ad formats manually" → "Pop-Under" 로 만든, Autotag를
 * 거치지 않는 단독 존. `aclib.runPop({ zoneId })` 하나만 부르고 다른 포맷은
 * 섞이지 않는다.
 */
// export const ACS_AUTOTAG_ZONE = 'vbzjudlnvz';

/** 전용 Pop-Under 존(2026-09-04 생성). Autotag 를 거치지 않아 클릭을 막지 않는다. */
export const ACS_POPUNDER_ZONE = '12101602';

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
