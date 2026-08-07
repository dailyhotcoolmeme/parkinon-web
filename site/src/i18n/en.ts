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
 *
 * ⚠️ 이 파일의 모든 값은 그대로 **번역만** 되어 전 언어판에 실린다. 그래서
 * **기관명·통계·나라별 사실을 담은 문장은 여기 넣으면 안 된다** — 한국 기관명이
 * 하나라도 들어가면 그게 그대로 영어·일본어판에 번역돼 나간다(exercise.tagline
 * 사고, 2026-08-07, memory feedback_universal_hero_tagline). 그런 문장(제도 안내,
 * 출처 인용, 영상 목록 등)은 사전이 아니라 언어별 데이터 파일(`exerciseSource.<언어>.ts`
 * 같은)이나 언어별 페이지에 쓴다. 새 히어로·안내 문구를 추가하기 전에 스스로 물을 것 —
 * "이 문장에 나라마다 달라질 사실이 들어 있는가?"
 */
const en = {
  'brand.name': 'Parkinon',
  'site.description': 'Parkinon — making each day with Parkinson’s a little easier',

  // 메뉴 — 항목별 노출 여부는 src/lib/nav.ts 의 AVAILABLE 이 정한다(번역과 별개)
  'nav.news': 'News',
  'nav.lifestyle': 'Daily living',
  'nav.clinical': 'Clinical trials',
  'nav.exercise': 'Exercise videos',
  /* ⚠️ 허브 히어로 보조문구 — 절대 기관명·통계·나라별 사실을 넣지 말 것.
     이 값은 그대로 '번역'만 되어 모든 언어판에 실린다(다시 쓰지 않는다).
     한국 기관명 하나라도 들어가면 그게 그대로 영어·일본어판에 번역돼 실린다.
     "이 문장에 기관명·수치·나라별 사실이 있는가?" 먼저 확인할 것
     (memory feedback_universal_hero_tagline, 2026-08-07 사고). */
  'exercise.tagline': 'A little movement each day can make you feel lighter — follow along at your own pace.',

  'nav.institutions': 'Benefits & support',
  'nav.tools': 'Tools',

  // 임상시험 — 나라 이름·상(phase) 이름. clinicalTrials.ts(공용 로직)가 이 라벨을 쓴다.
  // ⚠️ 이 값들도 exercise.tagline 과 같은 이유로 사전에 있다 — 그대로 번역만 될 값이다.
  'country.kr': 'South Korea',
  'country.us': 'United States',
  'country.jp': 'Japan',
  'country.fr': 'France',
  'country.de': 'Germany',
  'country.it': 'Italy',
  'country.au': 'Australia',
  'phase.EARLY_PHASE1': 'Early Phase 1',
  'phase.PHASE1': 'Phase 1',
  'phase.PHASE2': 'Phase 2',
  'phase.PHASE3': 'Phase 3',
  'phase.PHASE4': 'Phase 4',
  'phase.NA': 'Not applicable',

  // 임상시험 페이지 UI 문구 — 전부 전 언어 공통(사전에만 있음, 나라별 데이터 아님)
  'clinical.tagline': 'See Parkinson\u2019s clinical trials that are currently recruiting, by country.',
  'clinical.englishNotice': 'These are Parkinson\u2019s clinical trials currently underway, for your reference. If one looks relevant, talk to your doctor or nurse about it.',
  'clinical.phase': 'Phase',
  'clinical.location': 'Location',
  'clinical.moreLocations': '+{n} more locations',

  // 임상 단계 물음표 툴팁 — ClinicalTrials.gov 공식 용어집 정의 그대로(2026-08-08).
  // 나라마다 다를 이유가 없는 보편적 정의라 사전에 둔다.
  'phaseDesc.EARLY_PHASE1': 'An exploratory step before the standard Phase 1, checking how a drug behaves in the body with very few participants. It has no treatment or diagnostic goal.',
  'phaseDesc.PHASE1': "Focuses on a drug's safety. Usually done with healthy volunteers, in a small number of participants.",
  'phaseDesc.PHASE2': "Gathers early evidence on whether a drug works, while safety is still monitored.",
  'phaseDesc.PHASE3': 'Gathers more evidence on safety and effectiveness across different groups and doses, with more participants.',
  'phaseDesc.PHASE4': 'Happens after a drug is approved, to gather further information on safety, effectiveness, or best use.',
  'phaseDesc.NA': 'A trial without a drug-development phase (for example, a device or behavioral study).',
  'clinical.phaseHelp': 'What does this phase mean?',
  'clinical.phaseMore': 'Learn more',
  'clinical.duration': 'Duration',
  'clinical.estimated': 'estimated',
  'clinical.recruiting': 'Recruiting',
  'clinical.sponsor': 'Sponsor',
  'clinical.contact': 'Contact',
  'clinical.viewOriginal': 'View on ClinicalTrials.gov',
  'clinical.noTrials': 'No recruiting trials found for this country right now.',
  'clinical.overflowNote': 'Showing the {shown} most recently updated of {total} trials.',
  'clinical.seeAll': 'See all on ClinicalTrials.gov',
  'clinical.disclaimer': 'This list is for information only. If you are interested in joining a trial, talk to your doctor first and contact the study team directly.',

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
