# 네이버 카페 「파킨온 소식」 작성법

파킨온 웹의 **뉴스 글(`/ko/news/`)이 새로 올라가면, 그 글을 네이버 카페에 그대로 옮겨 올린다.**
새로 쓰는 글이 아니다. **옮기는 작업이다.** 제목도 내용도 사진도 웹 글 것을 쓴다.

> 🚨 이 문서를 읽지 않고 카페 글을 쓰지 마라. 2026-09-02 에 이걸 안 보고 시작했다가
> 오너가 크게 화냈다. 형식·사진·제목을 전부 임의로 정하려 했기 때문이다.

---

## 0. 빠른 시작 (매번 이 순서)

```bash
cd /Users/ourmine/dev/parkinon-web

node scripts/naver-cafe/launch.mjs        # 크롬 띄우기 → 오너가 직접 로그인
node scripts/naver-cafe/list-posts.mjs    # 지금까지 올린 소식 = 다음 번호
node scripts/naver-cafe/dump-post.mjs 49162   # 지난 글 형식 그대로 뽑아 대조 (아래 표에서 최신 글번호로 바꿔 쓸 것)
```

`launch.mjs` 는 이미 떠 있으면 **알려만 주고 절대 죽이지 않는다.** 오너 로그인 세션이다.
형식은 **기억으로 쓰지 말고 `dump-post.mjs` 로 지난 글을 뽑아 옆에 두고** 쓴다.

**본문을 실제로 타이핑해 넣는 건 손으로 하지 말고 `scripts/naver-cafe/write-helpers.mjs`
를 써라** — 9절에 사용법과, 자동화하며 실측으로 확인한 함정들이 정리돼 있다. 이 문서를
안 읽고 처음부터 다시 시도하면 같은 함정에 또 빠진다(2026-09-14에 실제로 여러 번 겪음).

---

## 1. 어디에 올리나

| 항목 | 값 |
|---|---|
| 카페 | **파킨슨병** `cafe.naver.com/parkinson777` (clubid **11763699**) |
| 게시판 | **자유로운글** (menuid **3**) |
| 계정 | **김포사위** |
| 브라우저 | CDP 크롬 **포트 9502**, 프로필 `~/Library/Caches/parkinon-naver-profile` |
| 글쓰기 | `https://cafe.naver.com/ca-fe/cafes/11763699/menus/3/articles/write` |

로그인은 **오너가 직접 한다.** 브라우저만 띄우고 기다린다.

---

## 2. 지금까지 올린 글 (번호는 카페 자체 연번)

| 카페 | 글번호 | 원본 웹 글 | 웹 발행일 |
|---|---|---|---|
| #1 | 48662 | `stem-cell-fasttrack-alphasynuclein-pathway-news.mdx` | 2026-08-19 |
| #2 | 48736 | `gut-bacteria-comt-levodopa-news.mdx` | 2026-08-21 |
| #3 | 48774 | `early-rehab-survival-hallucination-cholinergic-news.mdx` | 2026-08-25 |
| #4 | 48949 | `extended-release-levodopa-eu-blood-gene-score-news.mdx` | 2026-09-01 |
| #5 | 49161 | `ai-rapid-decline-lrrk2-iron-news.mdx` | 2026-09-07 |
| #6 | 49162 | `antibody-delivery-mc1r-progression-news.mdx` | 2026-09-14 |

**다음에 올릴 글** = `site/src/content/articles/ko/news/` 에서 위 표에 없는 가장 오래된 글.
카페 번호는 **웹 글의 태그 번호와 무관한 별도 연번**이다.

기존 글 목록을 다시 확인하려면(검색 API 는 404 난다. 목록 API 를 페이지로 넘겨라):

```js
// 카페 페이지를 연 상태에서 실행해야 CORS 를 통과한다
fetch(`https://apis.naver.com/cafe-web/cafe2/ArticleListV2dot1.json` +
      `?search.clubid=11763699&search.menuid=3&search.queryType=lastArticle` +
      `&search.page=${page}&search.perPage=50`, {credentials:'include'})
```

---

## 3. 제목

```
파킨온 소식 #N. <웹 글 제목 그대로>
```

🚨 **제목을 새로 짓지 마라.** 웹 글 `title:` 을 한 글자도 바꾸지 말고 그대로 붙인다.
"카페에는 짧은 게 낫지 않을까" 같은 판단을 하지 말 것 — 오너가 명시적으로 금지했다.

---

## 4. 본문 구조 (#1~#3 공통 정본)

에디터 컴포넌트 순서. `[본문]`=텍스트, `[인용구]`=인용구 블록, `[사진]`=이미지, `[링크]`=OG링크 카드.

```
[본문]  안녕하세요. 김포사위입니다.
        지난 파킨온 소식 게시글에 이어 새로운 글입니다. 2~3일에 한번씩 올리겠습니다.
        (빈 줄)
        ------------------------------------------------------------   ← 하이픈 60개, 그냥 텍스트
        (빈 줄)
        #이번에는 …                     ← 두 소식을 한 문장으로 묶는 도입 2~3줄
        (빈 줄)
        [소식 1] <소제목>               ← 19px / #54b800 / 굵게
        (빈 줄)
        🔍 이렇게 나왔습니다            ← 굵게
        <연구 내용>
        (빈 줄)
        ✅ 환자분께                     ← 굵게
        <환자 입장에서의 의미>
[인용구] 💡 <한계·주의>                 ← 16px
[본문]  🙋 보호자분께                   ← 굵게
        <보호자가 할 수 있는 것>
[사진]  ← 웹 글의 **본문 중간 사진** 1장
[본문]  [소식 2] <소제목>               ← 19px / #54b800 / 굵게
        🔍 이렇게 나왔습니다
        ✅ 환자분께
[인용구] 💡 <한계·주의>
[본문]  🙋 보호자분께
        (빈 줄)
        🧭 지금 할 수 있는 것            ← 두 소식을 하나로 묶는 마무리
        (빈 줄)
        ※ 이 글은 최근 발표된 연구와 기사 내용을 쉬운 말로 정리해 다시 쓴 것입니다.
          의학적 진단이나 치료를 대신하지 않으며, 국내 허가·도입 여부와는 무관합니다.
          새로운 치료에 관한 궁금한 점은 담당 의료진과 상담하시기 바랍니다.
[링크]  https://parkinon.com/ko/news/   ← 🚨 필수. 아래 5절
[본문]  (빈 줄 하나)
```

**본문 글자**: 15px, `#111111`. **소제목**: 19px, `#54b800`, 굵게. **인용구**: 16px.

웹 글의 용어 툴팁(`<Term>`)은 카페에 없다 → **괄호 설명으로 풀어서** 넣는다.
예: "아세틸콜린(뇌에서 신호를 전달하는 물질 중 하나로, …)".

출처 링크는 본문에 넣지 않는다. 링크는 맨 끝 파킨온 카드 하나뿐이다.

---

## 5. 🚨 맨 끝 링크 — 빠뜨리지 마라

#1·#2·#3 은 전부 **OG링크 카드**로 끝난다.

```
주소: https://parkinon.com/ko/news/     ← 루트(parkinon.com)가 아니라 /ko/news/
카드: 파킨온 소식 — 파킨온
      ParkinON — 파킨슨병과 함께하는 하루하루, 조금 더 수월하게
      parkinon.com
```

**넣는 법 — 툴바 「링크」 버튼을 쓰면 안 된다.** 그건 글감(책·영화·쇼핑) 검색창이 열리고,
URL 을 넣어도 "검색 결과가 없습니다" 만 나온다. 실제로 되는 절차는 이것뿐이다.

1. 본문 맨 끝 빈 줄에 커서를 두고 **주소를 그냥 타이핑**한 뒤 **Enter**
   → 몇 초 뒤 카드가 자동 생성된다(공개설정의 *자동출처 사용* 이 켜져 있어야 한다)
2. 생성된 카드는 `se-l-large_image` (썸네일 큰 카드)다. 카드 안의
   **「이미지 썸네일 삭제」** 를 누르면 `se-l-text` 로 바뀐다 — **#1~#3 과 같은 모양**
3. 카드 위에 **주소 글자 한 줄이 그대로 남는다.** 그 줄을 지운다
   (줄 끝 클릭 → `End` → `Shift+Home` → `Backspace`). 남기면 #1~#3 과 달라진다

끝난 모양: `[본문 …※면책]` → `[링크 카드]` → `[빈 줄]`

🚨 **#4(48949) 에서 이걸 빠뜨렸다가 2026-09-03 에 수정해 넣었다.** 카드 대신 `🔗 더 많은 파킨슨 소식과 정보는 parkinon.com`
이라는 텍스트 줄에 `https://parkinon.com` 을 걸어서 올렸고, 오너가 지적했다
("너 왜 마지막에 parkinon.com에 링크 안걸었냐?"). **카페 글을 쓰는 이유 자체가 웹 유입이다.
링크가 빠지면 글을 쓴 의미가 없다.** 등록 전에 이 한 줄을 반드시 확인할 것.

---

## 6. 사진

🚨 **사진을 새로 준비하지 마라. 웹 글에 이미 있는 사진을 쓴다.**
(오너: "이미 파킨온 뉴스에 사진 있잖아! 그거 쓰는거라고!!! 왜 사진을 니가 준비하냐고!")

- 정본은 **본문 중간 사진(`import …Img`) 1장**, 소식 1과 소식 2 **사이**에 넣는다.
  웹 글에서 그 사진이 놓인 자리와 같은 위치다.
- `site/src/assets/images/` 의 원본 파일을 스크래치패드로 복사해 업로드한다.
- #4 는 히어로까지 2장을 넣었고 지적은 없었다. 다만 **기본은 1장(중간 사진)** 이다.

---

## 7. 등록

🚨 **오너가 "눌러라"라고 하기 전에 등록을 누르지 마라.** 다 쓰면 먼저 보고한다.
(오너: "바로 하지 말고 보고를 하라고!")

**기존 글 수정**: 글 화면의 `수정` 버튼을 누르면 **새 탭**이 열린다
(`…/ca-fe/cafes/11763699/articles/<글번호>/modify`). `/edit` 주소를 직접 치면 빈 화면이 나온다.
수정 화면의 저장 버튼도 이름은 **등록**이다.

**등록 버튼 함정**: 화면 좌표로 클릭하면 바로 아래 **서체 드롭다운**이 열린다.
2026-09-02 에 이걸로 임시등록만 되고 게시가 안 됐다. 반드시 DOM 으로 찾아서 눌러라.

```js
// innerText 가 정확히 '등록' 인 버튼 (className: BaseButton BaseButton--skinGreen)
const b = [...document.querySelectorAll('button,a,[role="button"]')]
  .find(e => e.innerText.trim() === '등록' && e.getBoundingClientRect().width > 0);
```

게시되면 URL 이 `…/ArticleRead.nhn…articleid=NNNNN…` 으로 바뀐다.
**URL 이 `/write` 그대로면 게시되지 않은 것이다.** 보고는 글 주소로 한다:
`https://cafe.naver.com/parkinson777/48949`

---

## 8. 등록 전 점검표

- [ ] 제목 = `파킨온 소식 #N.` + 웹 글 제목 **그대로**
- [ ] 사진 = 웹 글의 중간 사진, 소식 1과 소식 2 **사이**
- [ ] 소제목 19px `#54b800` 굵게 / 본문 15px `#111111`
- [ ] 💡 는 인용구 블록, 16px
- [ ] ※ 면책 문구 있음
- [ ] **맨 끝 OG링크 카드 → `https://parkinon.com/ko/news/`**
- [ ] 오너에게 보고하고 "눌러라" 를 받았는가

---

## 9. 쓰기(작성) 자동화 — `scripts/naver-cafe/write-helpers.mjs` (2026-09-14 확보)

🚨 **이 문서를 안 읽고 처음부터 다시 시도하지 마라.** 2026-09-14에 이 부분을 자동화하며
같은 함정에 여러 번 반복해서 빠졌다 — 여기 적힌 대로 하면 그 시행착오를 안 겪는다.

이 에디터(네이버 SmartEditor)는 **진짜 브라우저 포커스가 화면에 안 보이는 단일
`contenteditable` 프록시 요소에 있다** — 화면에 보이는 문단(`<p class="se-text-paragraph">`)
은 그 상태를 반영한 렌더링일 뿐이다. 그래서 겉보기엔 멀쩡해 보여도 클릭·타이핑이 조용히
씹히는 경우가 흔하다. `write-helpers.mjs`는 이 문제들을 전부 우회해 둔 재사용 가능한
함수 모음이다.

```js
import * as H from './write-helpers.mjs';

const page = await H.freshWritePage();           // 새 글쓰기 탭 열기(창 크기도 키움)
await H.setTitle(page, '파킨온 소식 #N. …');
await H.clickBody(page);

await H.typePlain(page, '본문 한 문단');
await H.newParagraph(page, 2);                    // 2 = 빈 줄 하나 두고 다음 문단
await H.typeStyledLine(page, '[소식 1] …', { size: 19, color: '#54b800', bold: true });
await H.newParagraph(page, 1);
await H.typeStyledLine(page, '🔍 이렇게 나왔습니다', { bold: true });
// ...
await H.insertQuote(page, '인용구 본문');          // 💡 없이 그냥 텍스트만 넘긴다
await H.typeStyledLine(page, '🙋 보호자분께', { bold: true });
// ...
await H.insertImage(page, '/절대/경로/사진.jpg');  // insertQuote 처럼 그 다음 바로 이어 쓰면 됨
// ...
await H.insertClosingLink(page, 'https://parkinon.com/ko/news/');  // 5절 전체를 대신함
const result = await H.submit(page);              // { url, articleId } 반환, 실패 시 throw
```

**실측으로 확인된 함정 — 이유를 모르고 다시 부딪히지 않도록:**

1. **타이핑이 가끔 통째로 반영 안 됨.** 원인은 특정 못 함(포커스가 실제로는 다른 데
   있었던 것으로 추정). `typePlain`/`typeStyledLine`/`insertClosingLink` 전부 타이핑
   직후 실제로 반영됐는지 확인하고, 안 됐으면 마지막 문단을 다시 클릭해 재시도한다.
   이 검증 없이 그냥 `page.keyboard.type()`만 부르면 문장이 통째로 사라진 채 넘어간다
   (2026-09-14 실제로 두 편 다 이 문제로 제목 줄이 사라짐 → 발행 뒤 발견 → 수동 패치).
2. **인용구 안에서 `Enter`로는 절대 못 빠져나온다.** 계속 인용구 안에 새 줄만 추가된다.
   `Escape`도 안 먹는다. 문서 맨 끝일 때 "아래 빈 공간"을 좌표로 클릭하는 방식도
   실패한다 — 태그 입력창(`WritingTag`) 영역과 겹쳐서 거기를 클릭하게 된다.
   **유일하게 확실한 방법**: 인용구 버튼을 다시 눌러 빈 인용구를 하나 더 만들고
   (`아직 아무것도 안 썼으니 옆에 잡아먹을 내용도 없음`), 문단서식 드롭다운(`본문`
   버튼)으로 그 컴포넌트를 일반 텍스트로 바꾼다. `insertQuote`/`insertImage` 둘 다
   내부적으로 이 방법(`landOnCleanParagraph`)을 쓴다.
3. **사진을 한 번이라도 넣으면 그 사진의 "떠있는 편집 툴바"가 페이지에 영구히 남는다**
   (`se-flayer-unified-toolbar`). `Escape`로 안 닫히고, 그 뒤로 **문서 어디를 클릭하든**
   계속 끼어들어 클릭을 가로챈다. DOM에서 통째로 지우는 것 말고는 방법이 없었다
   (`removeFloatingToolbars`, `insertClosingLink`가 자동으로 부름).
4. **맨 끝 링크에서 `Home`/`Shift+Home`이 이 특정 위치(카드 바로 위 문단)에서 안 먹힐
   때가 있다.** 글자 수만큼 `Backspace`를 반복하는 방식으로 우회했다.
5. **`.locator('.se-text-paragraph').last()`(문서 전체 기준)가 아니라, 항상 특정
   컴포넌트 안의 마지막 문단**(`comp.locator('.se-text-paragraph').all()`의 마지막
   원소)을 쓴다. 문서 전체 기준 `.last()`는 위 3번 문제 때문에 자꾸 엉뚱한 걸 가리켰다.
6. **`b.close()`를 절대 호출하지 마라** — 오너의 실제 로그인 브라우저 창이 닫힌다.
   `connect()`로 붙기만 하고, 끝나면 그냥 스크립트를 종료한다.

**등록 전 실제로 눈으로 봐야 한다.** 위 자동화는 안정적이지만 100%는 아니다 —
`H.screenshotFull(page, '경로.png')`로 전체 캡처해서 스타일(초록/굵게)과 문장이 다
있는지 사람이 확인한 뒤에만 `submit()`을 부를 것. 빠진 줄을 발견하면: 그 문단을
찾아 클릭 → `Home` → 누락된 줄 타이핑 → `Enter` → 방금 쓴 줄을 선택해 스타일
적용(패치 방법은 커밋 이력의 이 문서 추가 시점 근처 세션 참고).
