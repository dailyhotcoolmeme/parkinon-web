import type { Dict } from './en';

/*
 * 한국어 사전. 기준은 `en.ts` 다 — 거기 있는 키가 여기 없으면 타입 오류로 빌드가 막힌다.
 * (한국어가 원본 언어이긴 하지만, 폴백 대상은 영어다. en.ts 주석 참고)
 */
const ko: Dict = {
  'brand.name': '파킨온',
  'site.description': 'ParkinON — 파킨슨병과 함께하는 하루하루, 조금 더 수월하게',

  'nav.news': '소식',
  'nav.lifestyle': '생활 요령',
  'nav.clinical': '임상시험',
  'nav.exercise': '운동 영상',
  // ⚠️ 이 값 수정 시 en.ts 의 exercise.tagline 위 경고를 먼저 읽을 것 — 기관명·나라별 사실 금지
  'exercise.tagline': '몸을 움직이면 마음도 한결 가벼워집니다 — 할 수 있는 만큼만 따라 해보세요.',

  'nav.institutions': '제도·지원',
  'nav.tools': '도구',

  'country.kr': '한국',
  'country.us': '미국',
  'country.jp': '일본',
  'country.fr': '프랑스',
  'country.de': '독일',
  'country.it': '이탈리아',
  'country.au': '호주',
  'phase.EARLY_PHASE1': '1상 전(초기)',
  'phase.PHASE1': '1상',
  'phase.PHASE2': '2상',
  'phase.PHASE3': '3상',
  'phase.PHASE4': '4상',
  'phase.NA': '해당 없음',

  'clinical.tagline': '지금 모집 중인 파킨슨병 임상시험을 나라별로 찾아볼 수 있습니다.',
  'clinical.englishNotice': '제목·문의처는 오역을 막기 위해 등록 원문(ClinicalTrials.gov) 그대로 영어로 보여드립니다.',
  'clinical.phase': '임상 단계',
  'clinical.location': '위치',
  'clinical.moreLocations': '외 {n}곳 더',
  'clinical.recruiting': '모집 중',
  'clinical.sponsor': '주관',
  'clinical.contact': '문의',
  'clinical.viewOriginal': 'ClinicalTrials.gov에서 원문 보기',
  'clinical.noTrials': '지금은 이 나라에서 모집 중인 시험이 없습니다.',
  'clinical.overflowNote': '전체 {total}건 중 최근 갱신된 {shown}건을 보여줍니다.',
  'clinical.seeAll': 'ClinicalTrials.gov에서 전체 보기',
  'clinical.disclaimer': '이 목록은 정보 제공용입니다. 참여를 원하시면 먼저 담당 의사와 상의하고 연구팀에 직접 문의하세요.',

  // 메뉴는 '소식' 이지만 카테고리 라벨은 아직 '파킨온 소식' 이다.
  // 허브 페이지 문구가 옛 정의(파킨온이 정리하는 연구 요약)로 쓰여 있어서,
  // 소식 발행 체계를 만드는 0-7 에서 한꺼번에 다시 쓴다.
  'category.news': '파킨온 소식',
  'category.lifestyle': '생활 요령',
  'category.institutions': '제도·지원',

  'header.search': '검색',
  'header.menu': '메뉴',
  'header.searchPlaceholder': '궁금한 내용을 검색해보세요',

  'breadcrumb.home': '홈',

  'ad.label': '광고',

  'side.tocTitle': '이 글 순서',
  'side.moreIn': '{category} 다른 글',

  'source.title': '출처',
  'source.contact': '문의',
  'source.notice': '내용이 바뀐 것을 발견하시면 admin@ourmine.co.kr 로 알려주세요.',

  'app.promoTitle': '약 복용은 앱으로 관리하세요',
  'app.promoBody': '파킨온 앱은 복용 시간을 알려주고 기록을 남깁니다. 보호자와도 함께 볼 수 있습니다.',
  'app.shotAlt': '파킨온 앱의 오늘 복용 현황 화면',

  'footer.quickLinks': '바로가기',
  'footer.support': '고객지원',
  'footer.privacyWeb': '개인정보처리방침',
  'footer.termsApp': '앱 이용약관',
  'footer.privacyApp': '앱 개인정보처리방침',
  'footer.contact': '문의하기',
  'footer.disclaimer':
    '본 사이트의 정보는 의학적 자문을 대체하지 않습니다. 모든 의학적 결정은 반드시 전문의와 상의하시기 바랍니다.',
  'footer.company': '주식회사 아워마인',
  'footer.bizInfo': '사업자 정보',
  'footer.bizCeo': '대표',
  'footer.bizNumber': '사업자등록번호',
  'footer.bizMailOrder': '통신판매업신고',
  'footer.bizAddress': '주소',
  'footer.bizPhone': '고객센터',
  'footer.bizEmail': '이메일',

  'lang.self': '한국어',
};

export default ko;
