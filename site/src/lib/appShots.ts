/*
 * 글 하단 "앱 추천" 블록에 어떤 앱 화면을 보여줄지 — 언어별 기준을 여기 한 곳에서 정한다.
 *
 * 왜 한 곳에 모았나(2026-08-12 오너 지시):
 *  - 예전엔 AppPromo.astro 가 한국어 스크린샷만 고정으로 들고 있어서 **영어 페이지에
 *    한국어 앱 화면**이 나갔다.
 *  - 그 다음엔 영어 매핑이 5종뿐이라 42편 중 34편이 **같은 그림**으로 폴백됐다.
 *  - 앞으로 파킨온 소식이 이틀에 한 번꼴로 올라오므로, 글이 늘 때마다 같은 실수가
 *    반복되지 않게 "언어별로 쓸 수 있는 화면"과 "기능이 아예 없는 항목"을 데이터로 못박는다.
 *
 * ⚠️ 언어를 추가할 때 반드시 세 가지를 같이 정한다.
 *    1) 그 언어의 실제 앱 화면 이미지 (없으면 fallbackLocale 로 넘긴다 — 단 한국어로는 절대 안 넘긴다)
 *    2) 그 언어판 앱에 **없는 기능**(unavailable) — 없는 기능을 소개하면 거짓 광고가 된다
 *    3) 화면이 없는 기능을 어디에 붙일지(내용상 가장 가까운 실제 화면)
 */

// ── 한국어: 앱 화면 9종 전부 있음 ──────────────────────────────
import koHome from '../assets/images/appshots/parkinon1.png';
import koTracking from '../assets/images/appshots/parkinon2.png';
import koExercise from '../assets/images/appshots/parkinon3.png';
import koRecord from '../assets/images/appshots/parkinon4.png';
import koMedReg from '../assets/images/appshots/parkinon5.png';
import koFamily from '../assets/images/appshots/parkinon6.png';
import koReminder from '../assets/images/appshots/parkinon7.png';
import koDiary from '../assets/images/appshots/parkinon8.png';
import koCommunity from '../assets/images/appshots/parkinon_etc.png';

/*
 * ── 영어: 미국 App Store 게재분 6종 ──────────────────────────
 * 파일명이 스토어 등록명이라 한국어판(parkinon1..8)과 다르다.
 * 06_premium 은 결제 화면이 아니라 '내정보' 탭이라 Family Diary·View my records·
 * Medical visits 메뉴가 보인다 → record·family·familyDiary 에 쓴다(화면을 직접 보고 정함).
 */
import enHome from '../assets/images/appshots/en/01_medications.png';
import enTracking from '../assets/images/appshots/en/02_tracking.png';
import enExercise from '../assets/images/appshots/en/03_exercise.png';
import enReminder from '../assets/images/appshots/en/04_reminders.png';
import enMedReg from '../assets/images/appshots/en/05_add_medication.png';
import enMyInfo from '../assets/images/appshots/en/06_premium.png';

/*
 * ── 일본어: 일본 App Store 게재분 5종 ────────────────────────
 * 파일명을 믿지 말고 화면을 직접 열어 확인했다(2026-08-12):
 *  · JA_01_home      = お薬 탭 "お薬を記録する" + 今日のお薬  → 기본 화면
 *  · JA_02_bodystate = 体調 탭 "体調と気分を記録"            → effectTracking
 *  · JA_03_exercise  = 運動 탭                              → exercise
 *  · JA_04_overseas  = ⚠️ 이름과 달리 **お知らせ 설정 화면**  → reminder
 *  · JA_05_myinfo    = マイページ(家族日記·記録を見る·通院の記録) → record·family·familyDiary
 * medRegistration 만 전용 화면이 없어 기본 화면(お薬 홈)으로 나간다 — 같은 お薬 탭이라 무리 없다.
 */
import jaHome from '../assets/images/appshots/ja/JA_01_home.png';
import jaBodyState from '../assets/images/appshots/ja/JA_02_bodystate.png';
import jaExercise from '../assets/images/appshots/ja/JA_03_exercise.png';
import jaReminder from '../assets/images/appshots/ja/JA_04_overseas.png';
import jaMyInfo from '../assets/images/appshots/ja/JA_05_myinfo.png';

/*
 * ── 프랑스어: 캐나다 App Store 게재분 5종 ───────────────────
 * ⚠️ 처음에 "프랑스어 화면은 없다"고 잘못 판단했었다 — iTunes lookup 을 lang 파라미터
 *    없이 불러서 캐나다 스토어의 기본 언어(영어) 세트만 봤기 때문이다(오너 지적 2026-08-12).
 *    `?country=ca&lang=fr_ca` 로 부르면 프랑스어 세트가 나온다. 다른 언어를 찾을 때도 같다.
 * FR_04_overseas 는 이름과 달리 '알림(Rappels)' 설정 화면이다(일본어판과 같은 구성).
 */
import frHome from '../assets/images/appshots/fr/FR_01_home.png';
import frBodyState from '../assets/images/appshots/fr/FR_02_bodystate.png';
import frExercise from '../assets/images/appshots/fr/FR_03_exercise.png';
import frReminder from '../assets/images/appshots/fr/FR_04_overseas.png';
import frMyInfo from '../assets/images/appshots/fr/FR_05_myinfo.png';

/** 글 frontmatter 의 `appFeature` 로 쓸 수 있는 값. */
export const APP_FEATURES = [
  'effectTracking',
  'exercise',
  'record',
  'medRegistration',
  'family',
  'reminder',
  'familyDiary',
  'community',
] as const;
export type AppFeature = (typeof APP_FEATURES)[number];

interface LocaleShots {
  /** appFeature 가 없거나, 그 언어에 대응 화면이 없을 때 쓰는 기본 화면. */
  default: ImageMetadata;
  features: Partial<Record<AppFeature, ImageMetadata>>;
  /**
   * 그 언어판 **앱에 기능 자체가 없는** 항목. 이미지가 없는 것과 전혀 다른 문제다.
   * 여기 들어간 값은 이미지뿐 아니라 홍보 문구까지 통째로 무시하고 기본 홍보로 돌린다.
   */
  unavailable?: readonly AppFeature[];
  /** 이 언어의 이미지가 아예 없을 때 대신 쓸 언어. 한국어로는 절대 보내지 않는다. */
  fallbackLocale?: string;
}

export const SHOTS_BY_LOCALE: Record<string, LocaleShots> = {
  ko: {
    default: koHome,
    features: {
      effectTracking: koTracking,
      exercise: koExercise,
      record: koRecord,
      medRegistration: koMedReg,
      family: koFamily,
      reminder: koReminder,
      familyDiary: koDiary,
      community: koCommunity,
    },
  },

  en: {
    default: enHome,
    features: {
      effectTracking: enTracking,
      exercise: enExercise,
      reminder: enReminder,
      medRegistration: enMedReg,
      // 전용 화면이 없어 '내정보'(기록 메뉴가 보이는 화면)로 묶는다.
      record: enMyInfo,
      family: enMyInfo,
      familyDiary: enMyInfo,
    },
    // 해외 앱에는 커뮤니티(정보·나눔) 탭이 아예 없다
    // (parkinon-app/src/navigation/MainNavigator.tsx:56-58 에서 다른 탭으로 교체).
    unavailable: ['community'],
  },

  ja: {
    default: jaHome,
    features: {
      effectTracking: jaBodyState,
      exercise: jaExercise,
      reminder: jaReminder,
      record: jaMyInfo,
      family: jaMyInfo,
      familyDiary: jaMyInfo,
      // medRegistration: 일본어 전용 약 등록 화면이 아직 없다 → 기본 화면으로 나간다.
    },
    unavailable: ['community'],
  },

  /*
   * 프랑스어: 캐나다(퀘벡)용. 프랑스 본토는 배포국이 아니다.
   * 구성은 일본어판과 같다 — medRegistration 전용 화면만 없어 기본 화면으로 나간다.
   */
  fr: {
    default: frHome,
    features: {
      effectTracking: frBodyState,
      exercise: frExercise,
      reminder: frReminder,
      record: frMyInfo,
      family: frMyInfo,
      familyDiary: frMyInfo,
    },
    unavailable: ['community'],
  },
};

/*
 * 앱이 그 언어를 지원하는가.
 *
 * ⚠️ 아래 resolveAppShot 은 모르는 언어를 **한국어 화면으로 대체**한다. 그 자체는 의도된
 * 안전장치지만, 앱이 아예 지원하지 않는 언어(스페인어·포르투갈어)에서는 **스페인어 독자에게
 * 한국어 앱 화면을 보여주는** 꼴이 된다. 그래서 그런 언어에서는 앱 홍보를 아예 그리지 않는다
 * (2026-09-02, es/pt 추가하면서). 앱이 그 언어를 지원하게 되면 SHOTS_BY_LOCALE 에 한 줄
 * 추가하는 것만으로 자동으로 다시 나온다.
 *
 * 앱 지원 언어의 정본은 `parkinon-app/src/i18n/locales/`(ko·en·ja·fr) 다.
 */
export const hasAppShots = (locale: string) => locale in SHOTS_BY_LOCALE;

/** 그 언어에서 실제로 보여줄 화면과, 문구에 쓸 기능값을 함께 돌려준다. */
export function resolveAppShot(locale: string, feature?: AppFeature) {
  const set = SHOTS_BY_LOCALE[locale] ?? SHOTS_BY_LOCALE.ko;
  const base = set.fallbackLocale ? SHOTS_BY_LOCALE[set.fallbackLocale] : undefined;

  // 그 언어판에 없는 기능이면 값을 버린다 → 이미지도 문구도 기본 홍보로.
  const blocked = set.unavailable ?? [];
  const feat = feature && !blocked.includes(feature) ? feature : undefined;

  const shot =
    (feat ? set.features[feat] : undefined) ??
    (feat && base ? base.features[feat] : undefined) ??
    set.default;

  return { shot, feature: feat };
}
