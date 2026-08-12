/*
 * 사업자 정보 — 여기 한 곳에서만 정한다.
 *
 * 값은 toolshere 의 정본(`toolshere/app/lib/business.ts`)을 그대로 따른다. 같은 회사이므로
 * 두 사이트가 다른 값을 말하면 안 된다. **여기서 새로 지어내지 말 것.**
 *
 * 왜 있는가(2026-08-12): 푸터가 대표자명·주소·통신판매번호를 한국어 문자열로 직접 박아 두고
 * 라벨만 사전을 거치고 있었다. 그래서 영어 페이지 아래에 "한민석, 최성철 /
 * 서울특별시 강동구 …"가 그대로 나왔다(오너 지적). 게다가 영문 상호가 사전에
 * `OURMINE Inc.` 로 들어가 있었는데 **실제 표기는 `OURMINE Co., Ltd.`** 다 —
 * 근거 없는 표기였다.
 *
 * toolshere 에서 이미 똑같은 사고가 있었고(그 파일 주석 참고: "푸터만 한국어로 남아
 * 영어 화면 아래에 주식회사 아워마인이 그대로 보였다"), 그때 만든 구조를 여기 옮긴 것이다.
 *
 * ★값 자체가 로케일별로 다르다. 상호·대표자·주소는 한국어 표기와 영문 표기가 따로 있고,
 *  사업자등록번호·이메일처럼 언어와 무관한 값은 하나뿐이다.
 *
 * ★한국 전자상거래법상 통신판매업자 표시의무 항목이라 어느 언어에서도 숨기지 않는다.
 */

export type BusinessInfo = {
  name: string;
  reps: string;
  address: string;
};

/* i18n-exempt:start — 법인 등록 정보의 '국문 표기' 자체다. 사전으로 옮길 대상이 아니라,
   영문 표기(EN)와 짝을 이루는 값이다. 사전에 넣으면 한 언어에 한 값만 있게 되어
   오히려 지금 고치는 버그(영어 화면에 국문 표기가 나오는 것)를 다시 만든다. */
const KO: BusinessInfo = {
  name: '주식회사 아워마인',
  reps: '한민석, 최성철',
  address: '서울특별시 강동구 양재대로85길 23, E&J빌딩 4층 4590호(성내동)',
};
/* i18n-exempt:end */

const EN: BusinessInfo = {
  name: 'OURMINE Co., Ltd.',
  reps: 'Minseok Han, Sungcheol Choi',
  address: '4590, 23 Yangjae-daero 85-gil, Gangdong-gu, Seoul, 05408, Republic of Korea',
};

/** 언어와 무관한 값 — 번호·연락처는 어느 언어에서도 같다. */
export const BIZ_NO = '342-81-04379';
/* i18n-exempt:start — 통신판매업 신고번호의 국문 표기(위 KO 와 같은 이유). */
const MAIL_ORDER_NO_KO = '제2026-서울강동-1129호';
/* i18n-exempt:end */
/*
 * ★"No."를 값에 넣지 않는다 — 라벨이 이미 "Mail-order business no." 라서
 *  "no. No. 2026-…" 으로 겹쳐 나온다(toolshere 에서 오너가 지적한 건과 같음).
 */
const MAIL_ORDER_NO_EN = '2026-Seoul Gangdong-1129';

/*
 * ★전화는 한국어 화면에만 표시한다(toolshere 오너 결정 2026-07-27을 따른다).
 *  한국 전자상거래법상 표시의무에 전화번호가 들어가 한국어에서는 뺄 수 없지만,
 *  해외 사용자에게 한국 번호는 실질적으로 쓸모가 없어(시차·통화료) 문의는 이메일로 받는다.
 */
const SUPPORT_TEL = '070-4513-1894';
export const SUPPORT_EMAIL = 'admin@ourmine.co.kr';
export const COMPANY_SITE = 'https://www.ourmine.co.kr';

const isKo = (locale: string) => locale.startsWith('ko');

export function business(locale: string): BusinessInfo {
  return isKo(locale) ? KO : EN;
}

export function mailOrderNo(locale: string): string {
  return isKo(locale) ? MAIL_ORDER_NO_KO : MAIL_ORDER_NO_EN;
}

/** 한국어에서만 전화번호를 돌려준다. 그 외 언어는 null → 화면에서 항목 자체를 그리지 않는다. */
export function supportTel(locale: string): string | null {
  return isKo(locale) ? SUPPORT_TEL : null;
}
