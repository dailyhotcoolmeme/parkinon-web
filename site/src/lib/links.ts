/*
 * 앱 스토어 주소 — **여기 한 곳에서만 관리한다.** 홈·글 하단 앱 추천이 이걸 같이 쓴다.
 *
 * 출처: 앱 저장소(parkinon-app)가 초대 메시지·`/about` 페이지에서 쓰고 있는 실제 주소.
 * 2026-08-06 접속 확인 — App Store "파킨온 앱", Play "파킨온 - 파킨슨 환자와 가족 케어".
 *
 * 애플은 한국어 페이지가 `/kr/` 경로다. 다른 언어는 지역 없는 주소를 쓰면 접속 국가에 맞춰
 * 애플이 알아서 보낸다(앱 저장소의 다국어 /about 페이지가 이미 그 방식이다).
 */
const APPLE_APP_ID = 'id6773573590';
export const ANDROID_PACKAGE = 'com.ourmine.parkinon';

export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

export function appleStoreUrl(locale = 'ko') {
  return locale === 'ko'
    ? `https://apps.apple.com/kr/app/${APPLE_APP_ID}`
    : `https://apps.apple.com/app/${APPLE_APP_ID}`;
}
