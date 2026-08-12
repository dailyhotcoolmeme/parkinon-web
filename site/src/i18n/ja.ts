import type { Dict } from './en';

/*
 * 일본어 사전. 기준은 `en.ts` 다 — 거기 있는 키가 여기 없으면 타입 오류로 빌드가 막힌다.
 *
 * 용어 기준(일본 파킨슨병 자료 조사 결과, 2026-08-12):
 *   - 환자는 `患者さん` 이 표준이고 존중하는 표현이다. 영어판의 person-first 규칙을
 *     일본어에 그대로 옮기지 않는다(일본어에서는 오히려 어색하다).
 *   - 보호자는 `ご家族`(돌보는 역할을 콕 집어야 할 때만 `介護者`).
 *     `ケアパートナー` 는 일본 파킨슨병 자료에서 쓰지 않는 말이라 절대 쓰지 않는다.
 *   - 병명은 `パーキンソン病`, 앱 이름은 일본 앱스토어 표기인 `パーキンオン`.
 *   - 전체 문체는 です・ます調(한국어판의 담담하고 따뜻한 어조와 같은 결).
 *   - 메뉴·버튼·배지 라벨은 짧게 — 길어지면 레이아웃이 깨진다.
 */
const ja: Dict = {
  'brand.name': 'パーキンオン',
  'site.description': 'パーキンオン — パーキンソン病とともに過ごす毎日を、もう少し楽に',

  'nav.news': '最新情報',
  'nav.lifestyle': '暮らしの工夫',
  'nav.clinical': '臨床試験・研究',
  'nav.exercise': '運動動画',
  // ⚠️ 이 값 수정 시 en.ts 의 exercise.tagline 위 경고를 먼저 읽을 것 — 기관명·나라별 사실 금지
  'exercise.tagline': '少し体を動かすだけで気持ちも軽くなります — できる範囲で一緒に続けてみましょう。',

  'nav.institutions': '制度・支援',
  'nav.tools': 'ツール',

  'country.all': 'すべて',
  'country.kr': '韓国',
  'country.us': 'アメリカ',
  'country.jp': '日本',
  'country.fr': 'フランス',
  'country.de': 'ドイツ',
  'country.it': 'イタリア',
  'country.au': 'オーストラリア',
  'country.ca': 'カナダ',
  'country.nz': 'ニュージーランド',
  'phase.EARLY_PHASE1': '早期第1相',
  'phase.PHASE1': '第1相',
  'phase.PHASE2': '第2相',
  'phase.PHASE3': '第3相',
  'phase.PHASE4': '第4相',
  'phase.NA': '該当なし',

  'clinical.tagline': '現在参加者を募集しているパーキンソン病の臨床試験を国別に探せます。関連する研究もあわせて確認できます。',
  'clinical.englishNotice': '現在、こうしたパーキンソン病の臨床試験が進められています。参考にしていただき、気になる試験があれば主治医や看護師にご相談ください。',
  'clinical.phase': '試験段階',
  'clinical.location': '実施場所',
  'clinical.moreLocations': 'ほか{n}か所',

  'phaseDesc.EARLY_PHASE1': '本格的な第1相の前に、薬が体の中でどのようにはたらくかをごく少人数で確かめる探索的な段階です。治療や診断を目的とはしていません。',
  'phaseDesc.PHASE1': '薬の安全性を確かめる段階です。多くの場合、健康な志願者を対象に少人数で行われます。',
  'phaseDesc.PHASE2': '薬に効果があるかどうかの初期の情報を集める段階です。安全性も引き続き確認します。',
  'phaseDesc.PHASE3': '安全性と効果についての情報をさらに集めるため、さまざまな対象や用量で比べながら進めます。参加者の人数が多くなります。',
  'phaseDesc.PHASE4': 'すでに承認された薬について、承認後の安全性・効果・最適な使い方の情報を集める段階です。',
  'phaseDesc.NA': '薬の開発段階の区分があてはまらない臨床試験です(医療機器や行動療法の研究など)。',
  'clinical.phaseHelp': 'この段階はどういう意味ですか？',
  'clinical.phaseMore': '詳しく見る',
  'term.readMore': '詳しく見る',
  'clinical.duration': '期間',
  'clinical.estimated': '予定',
  'clinical.recruiting': '募集中',
  'clinical.sponsor': '実施主体',
  'clinical.contact': 'お問い合わせ',
  'clinical.viewOriginal': 'ClinicalTrials.govで原文を見る',
  'clinical.noTrials': '現在、この国で募集中の試験はありません。',
  'clinical.overflowNote': '全{total}件のうち、最近更新された{shown}件を表示しています。',
  'clinical.seeAll': 'ClinicalTrials.govですべて見る',
  'clinical.disclaimer': 'この一覧は情報提供のみを目的としています。参加をご希望の場合は、まず主治医にご相談のうえ、研究チームへ直接お問い合わせください。',
  'clinical.feedTrials': '臨床試験',

  'research.feedLabel': '研究',
  'research.heading': '関連する研究',
  'research.tagline': 'パーキンソン病に関する主な研究を集めました。選定の基準は、第3相以上の試験・メタ分析・主要な医学雑誌(Lancet Neurology、Brain、Movement Disorders、JAMA Neurology、Neurology)です。',
  'research.journal': '掲載誌',
  'research.published': '発表',
  'research.readAbstract': 'PubMedで抄録を見る',
  'research.readFullText': '全文を読む',
  'research.paidNotice': '全文は有料です(購入後に閲覧できます)。上の内容は著者が公開した抄録の全文をそのまま載せたものです。',
  'research.translationPending': 'この論文の日本語訳はまだ準備中です。抄録の原文(英語)はPubMedでご覧いただけます。',
  'research.disclaimer': 'この研究結果を診療や治療の判断にそのまま当てはめないでください。気になる点は主治医にご相談ください。',
  'research.noPapers': '現在、基準に合う新しい研究はありません。',
  'research.overflowNote': '全{total}件のうち、最近の{shown}件を表示しています。',
  'research.seeAll': 'PubMedですべて見る',
  'research.pubtype.metaAnalysis': 'メタ分析',
  'research.pubtype.phase3': '第3相試験',
  'research.pubtype.phase4': '第4相試験',
  'research.pubtype.rct': 'ランダム化比較試験',
  'research.pubtype.systematicReview': 'システマティックレビュー',
  'research.pubtype.observational': '観察研究',

  'search.placeholder': 'タイトルで検索',
  'search.submit': '検索',
  'search.clear': 'クリア',
  'search.loadMore': 'もっと見る',
  'search.noResults': '検索結果がありません。',
  'search.resultCount': '検索結果{n}件',
  'search.resultCountForQuery': '「{q}」の検索結果{n}件',
  'search.filter.anyPhase': '試験段階すべて',
  'search.filter.startDate': '期間',
  'search.filter.sponsor': '実施主体',
  'search.filter.anyPubtype': '研究の種類すべて',
  'search.filter.anyJournal': '掲載誌すべて',
  'search.filter.year': '発表年',
  'search.filter.yearFrom': '開始年',
  'search.filter.yearTo': '終了年',

  'date.yearMonth': '{y}年{m}月',
  'date.yearOnly': '{y}年',

  'category.news': '最新情報',
  'category.lifestyle': '暮らしの工夫',
  'category.institutions': '制度・支援',

  'header.search': '検索',
  'header.menu': 'メニュー',
  'header.searchPlaceholder': '知りたいことを検索してみてください',

  'breadcrumb.home': 'ホーム',

  'ad.label': '広告',

  'side.tocTitle': 'この記事の目次',
  'side.moreIn': '{category}の他の記事',

  'article.summaryTitle': '要点まとめ',
  'article.relatedTitle': 'あわせて読みたい記事',

  'notFound.title': 'ページが見つかりません',
  'notFound.body': 'アドレスが変わったか、存在しないページかもしれません。下から探してみてください。',
  'notFound.home': 'ホームへ戻る',

  'source.title': '出典',
  'source.contact': 'お問い合わせ',

  'news.storyLabel': 'ニュース{index}',
  'news.sourceLink': '{name}の原文を見る',

  'home.todayRecommend': '{m}月{d}日のおすすめ',
  'home.todayDate': '今日 · {y}.{m}.{d}',
  'home.featureExpand': '全文を見る',
  'home.featureCollapse': '閉じる',

  'app.promoTitle': 'お薬の管理はアプリで',
  'app.promoBody': 'パーキンオンは服薬の時間をお知らせし、記録を残します。ご家族と一緒に見ることもできます。',
  'app.shotAlt': 'パーキンオンアプリの今日の服薬状況の画面',

  'app.effectTracking.title': '体調や気分もアプリに記録してみましょう',
  'app.effectTracking.body': '服薬のあとの体調や気分をお薬の予定に合わせて記録しておくと、薬の効き方を振り返る記録になります。',
  'app.effectTracking.alt': 'パーキンオンアプリ - 体調・気分の記録画面',
  'app.exercise.title': '今日の運動もアプリに残しましょう',
  'app.exercise.body': '運動の記録を残すと続ける励みになり、ご家族もどれくらい体を動かしたか一緒に確認できます。',
  'app.exercise.alt': 'パーキンオンアプリ - 運動記録の画面',
  'app.record.title': '症状もアプリに記録しておきましょう',
  'app.record.body': '日々の症状を記録しておくと、次の受診で変化を伝えるのがぐっと楽になります。',
  'app.record.alt': 'パーキンオンアプリ - 記録・管理の画面',
  'app.medRegistration.title': 'お薬はアプリに登録して管理しましょう',
  'app.medRegistration.body': '飲んでいるお薬と時間を登録しておけば、別に一覧を用意しなくても一目で確認できます。',
  'app.medRegistration.alt': 'パーキンオンアプリ - お薬の登録・管理画面',
  'app.family.title': 'ご家族と一緒に管理しましょう',
  'app.family.body': 'どちらかが記録すると、もう一方にも通知が届きます。離れて暮らしていてもお互いの様子を確認できます。',
  'app.family.alt': 'パーキンオンアプリ - 家族連携の画面',
  'app.reminder.title': '服薬の時間はアプリがお知らせします',
  'app.reminder.body': '決めておいた時間に通知が届き、飲んだかどうかチェックするだけで記録が自動でたまります。',
  'app.reminder.alt': 'パーキンオンアプリ - 服薬時間の設定・通知画面',
  'app.familyDiary.title': 'ご家族と一日を分かち合いましょう',
  'app.familyDiary.body': '短い日記を残しておくと、あとでまとめて本にすることもでき、ご家族も日記に参加できます。',
  'app.familyDiary.alt': 'パーキンオンアプリ - 家族日記の画面',
  'app.community.title': '同じような状況の方と話してみましょう',
  'app.community.body': 'パーキンオンアプリの情報・交流コミュニティでは、パーキンソン病の患者さんとご家族が経験を分かち合えます。',
  'app.community.alt': 'パーキンオンアプリ - 情報・交流コミュニティの画面',

  'medSchedule.deleteMed': '{name}を削除',

  'footer.quickLinks': 'クイックリンク',
  'footer.support': 'サポート',
  'footer.privacyWeb': 'プライバシーポリシー',
  'footer.termsApp': 'アプリ利用規約',
  'footer.privacyApp': 'アプリのプライバシーポリシー',
  'footer.contact': 'お問い合わせ',
  // PC에서 정확히 이 두 줄로 나뉘어야 한다(오너 지시 2026-08-10) — 그래서 한 문장씩
  // 키를 나누고 Footer.astro 에서 <br/> 로 잇는다.
  'footer.disclaimerLine1': '本サイトの情報は医学的なアドバイスに代わるものではありません。',
  'footer.disclaimerLine2': '医学的な判断は必ず医師にご相談ください。',
  'footer.bizInfo': '事業者情報',
  'footer.bizCeo': '代表者',
  'footer.bizNumber': '事業者登録番号',
  'footer.bizMailOrder': '通信販売業申告番号',
  'footer.bizAddress': '所在地',
  'footer.bizPhone': '電話',
  'footer.bizEmail': 'メール',
  'footer.bizWebsite': 'ウェブサイト',

  // 현재 언어 이름 — 자기 언어 이름을 자기 언어로
  'lang.self': '日本語',
};

export default ja;
