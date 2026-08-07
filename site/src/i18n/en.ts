/*
 * 영어 사전 = **기준 사전**이다.
 *
 * 두 가지 이유로 한국어가 아니라 영어를 기준으로 둔다.
 * 1) 폴백이 일어났을 때 한국어가 튀어나오면 프랑스·독일 사용자에게 아무 소용이 없다.
 *    영어면 최소한 읽을 수는 있다 (오너 지시 2026-08-07).
 * 2) 이 파일의 키 목록이 곧 타입이 된다 — 다른 언어 사전에서 키가 하나라도 빠지면
 *    `astro check` 가 실패해서 **배포가 막힌다**. 조용한 누락이 불가능해진다.
 *
 * 새 문구를 추가할 때는 반드시 여기부터 추가한다. 그러면 나머지 언어 사전이 전부
 * 빨간 줄이 뜨므로 어디를 채워야 하는지 저절로 드러난다.
 */
const en = {
  'brand.name': 'Parkinon',
  'site.description': 'Parkinon — making each day with Parkinson’s a little easier',

  // 메뉴 — 항목별 노출 여부는 src/lib/nav.ts 의 AVAILABLE 이 정한다(번역과 별개)
  'nav.news': 'News',
  'nav.lifestyle': 'Daily living',
  'nav.clinical': 'Clinical trials',
  'nav.exercise': 'Exercise videos',
  'nav.institutions': 'Benefits & support',
  'nav.tools': 'Tools',

  // 카테고리 라벨 — 빵부스러기와 사이드 패널 제목에 쓴다.
  // 메뉴 라벨과 일부러 분리해 뒀다: 메뉴는 짧게, 카테고리는 설명적으로 갈 수 있다.
  'category.news': 'News',
  'category.lifestyle': 'Daily living',
  'category.institutions': 'Benefits & support',

  'header.search': 'Search',
  'header.menu': 'Menu',
  'header.searchPlaceholder': 'Search for what you need',

  'breadcrumb.home': 'Home',

  'ad.label': 'Ad',

  'side.tocTitle': 'On this page',
  'side.moreIn': 'More in {category}',

  'source.title': 'Sources',
  'source.contact': 'Contact',
  'source.notice': 'If you find anything out of date, please let us know at admin@ourmine.co.kr.',

  'app.promoTitle': 'Manage your medication with the app',
  'app.promoBody':
    'Parkinon reminds you when to take your medication and keeps a record. Your family can follow along too.',
  'app.shotAlt': 'The Parkinon app showing today’s medication status',

  'footer.quickLinks': 'Quick links',
  'footer.support': 'Support',
  'footer.privacyWeb': 'Privacy policy',
  'footer.termsApp': 'App terms of service',
  'footer.privacyApp': 'App privacy policy',
  'footer.contact': 'Contact us',
  'footer.disclaimer':
    'The information on this site does not replace medical advice. Always consult your doctor before making any medical decision.',
  'footer.company': 'OURMINE Inc.',
  'footer.bizInfo': 'Business information',
  'footer.bizCeo': 'Representatives',
  'footer.bizNumber': 'Business registration no.',
  'footer.bizMailOrder': 'Mail-order business no.',
  'footer.bizAddress': 'Address',
  'footer.bizPhone': 'Phone',
  'footer.bizEmail': 'Email',

  // 현재 언어 이름 — 각 사전이 **자기 언어 이름을 자기 언어로** 적는다.
  // 언어 전환 UI 는 목록을 보여줘야 하므로, 한국어 화면이라도 'Français' 처럼 그대로 쓴다.
  'lang.self': 'English',
} as const;

export default en;

/** 모든 언어 사전이 지켜야 하는 모양. 키가 빠지거나 남으면 타입 오류가 난다. */
export type Dict = Record<keyof typeof en, string>;
export type DictKey = keyof typeof en;
