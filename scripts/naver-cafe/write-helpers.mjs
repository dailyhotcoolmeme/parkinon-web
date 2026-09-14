// 카페 글쓰기 공용 헬퍼 — 2026-09-14 실측으로 확보. 사용법·전체 그림은 docs/naver-cafe-news.md.
// 절대 원칙: launch.mjs 로 띄운 오너 로그인 브라우저에 connect() 로 "붙기"만 한다.
// b.close() 를 부르면 진짜 창이 닫힌다 — 절대 호출하지 말 것(연결만 끊고 싶으면 그냥 프로세스를 종료한다).
import { connect, WRITE_URL } from './lib.mjs';

export async function freshWritePage() {
  const b = await connect();
  const ctx = b.contexts()[0];
  const page = await ctx.newPage();
  await page.goto(WRITE_URL, { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(1500);
  // 창이 953px 남짓이면 인용구 뒤에 클릭할 여유 공간이 모자라진다 — 화면이 허용하는 만큼 키운다.
  try {
    const session = await page.context().newCDPSession(page);
    const { windowId } = await session.send('Browser.getWindowForTarget');
    await session.send('Browser.setWindowBounds', { windowId, bounds: { top: 0, left: 0, width: 1400, height: 1400 } });
    await page.waitForTimeout(300);
  } catch { /* 실패해도 계속 진행 */ }
  return page;
}

export async function setTitle(page, title) {
  await page.locator('.textarea_input').click();
  await page.keyboard.type(title, { delay: 5 });
}

export async function clickBody(page) {
  await page.locator('.se-text-paragraph').first().click();
}

// 가끔 타이핑한 게 통째로 반영이 안 될 때가 있다(포커스가 실제로는 다른 곳에 있었던 것으로
// 추정 — 원인 특정은 못 했지만 실측으로 반복 확인됨). 타이핑 뒤 실제로 반영됐는지 확인하고,
// 안 됐으면 마지막 문단을 다시 클릭해서 포커스를 확정한 뒤 재시도한다.
async function safeType(page, text, { delay = 10 } = {}) {
  const probe = text.replace(/\s+/g, ' ').slice(0, 12);
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.keyboard.type(text, { delay });
    await page.waitForTimeout(200);
    const info = await lastComponentInfo(page);
    if (info.text && info.text.replace(/\s+/g, ' ').includes(probe)) return;
    if (process.env.NA_DEBUG) console.log(`  [safeType attempt ${attempt}] 반영 안 됨, 재시도. text=`, JSON.stringify(probe));
    await page.locator('.se-text-paragraph').last().click();
    await page.waitForTimeout(250);
  }
  throw new Error('safeType: 타이핑이 반영되지 않았다 — ' + probe);
}

// 줄 하나를 타이핑하고 그 줄 전체를 선택한 뒤 스타일을 적용. 끝나면 커서를 줄 끝에 두고 스타일을 기본값으로 되돌린다(다음 타이핑에 안 번지게).
// 타이핑 자체는 safeType이 검증하지만, 그 뒤 스타일 적용 과정(Home/Shift+End/툴바 클릭)에서
// 드물게 방금 쓴 텍스트가 통째로 날아가는 게 실측으로 확인됐다 — 끝난 뒤 한 번 더 검증하고,
// 사라졌으면 처음부터 다시 쓴다.
export async function typeStyledLine(page, text, opts = {}) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await typeStyledLineOnce(page, text, opts);
    const info = await lastComponentInfo(page);
    const probe = text.replace(/\s+/g, ' ').slice(0, 12);
    if (info.text && info.text.replace(/\s+/g, ' ').includes(probe)) return;
    if (process.env.NA_DEBUG) console.log(`  [typeStyledLine attempt ${attempt}] 스타일 적용 후 텍스트가 사라짐 — 재시도. text=`, JSON.stringify(probe));
    await page.locator('.se-text-paragraph').last().click();
    await page.waitForTimeout(250);
  }
  throw new Error('typeStyledLine: 스타일 적용 후에도 텍스트가 계속 사라진다 — ' + text.slice(0, 30));
}

async function typeStyledLineOnce(page, text, { size, color, bold } = {}) {
  await safeType(page, text, { delay: 8 });
  await page.keyboard.press('Home');
  await page.keyboard.down('Shift');
  await page.keyboard.press('End');
  await page.keyboard.up('Shift');
  if (size) {
    await page.locator('.se-font-size-code-toolbar-button').first().click();
    await page.waitForTimeout(200);
    await page.locator(`.se-toolbar-option-font-size-code-fs${size}-button`).first().click();
  }
  if (color) {
    await page.locator('.se-font-color-toolbar-button').first().click();
    await page.waitForTimeout(200);
    await page.locator(`.se-color-palette[data-color="${color}"]`).first().click();
  }
  if (bold) await page.locator('.se-bold-toolbar-button').first().click();
  await page.keyboard.press('End');
  // 스타일이 다음 줄로 안 번지게 기본값으로 되돌린다
  if (bold) await page.locator('.se-bold-toolbar-button').first().click();
  if (size) {
    await page.locator('.se-font-size-code-toolbar-button').first().click();
    await page.waitForTimeout(200);
    await page.locator('.se-toolbar-option-font-size-code-fs15-button').first().click();
  }
  if (color) {
    await page.locator('.se-font-color-toolbar-button').first().click();
    await page.waitForTimeout(200);
    await page.locator('.se-color-palette-no-color').first().click();
  }
}

// 인용구 컴포넌트는 자동화로 계속 깨져서(빠져나오기가 불안정) 포기 — 굵은 일반 문단으로 대체.
export async function typeCallout(page, text) {
  await safeType(page, `💡 ${text}`, { delay: 12 });
  await page.keyboard.press('Home');
  await page.keyboard.down('Shift');
  await page.keyboard.press('End');
  await page.keyboard.up('Shift');
  await page.locator('.se-bold-toolbar-button').first().click();
  await page.keyboard.press('End');
  await page.locator('.se-bold-toolbar-button').first().click();
  await page.waitForTimeout(150);
}

export async function typePlain(page, text) {
  await safeType(page, text, { delay: 12 });
  await page.waitForTimeout(150);
}

export async function newParagraph(page, n = 1) {
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(120);
  }
}

async function lastComponentInfo(page) {
  return await page.evaluate(() => {
    const comps = [...document.querySelectorAll('.se-component')];
    const last = comps[comps.length - 1];
    return { count: comps.length, cls: last ? last.className : '', text: last ? last.textContent : null };
  });
}

// 인용구·이미지 뒤에서 Enter/Escape/좌표클릭으로는 못 빠져나온다(전부 실측으로 확인됨 —
// 인용구는 Enter가 안 먹고, 좌표클릭은 문서 맨 끝일 때 태그입력 영역과 겹치고, 이미지는
// 뜬 편집 툴바가 Escape에도 안 사라지고 클릭을 계속 가로챈다).
// 유일하게 확실한 방법: 인용구 버튼을 눌러 새 "빈" 인용구 컴포넌트를 만들고(아직 아무것도
// 안 썼으니 옆에 잡아먹을 내용도 없다), 문단서식 드롭다운으로 그 컴포넌트를 "본문"으로
// 바꾼다. 인용구 뒤·이미지 뒤 어느 쪽에서든 똑같이 먹힌다(실측 확인).
async function landOnCleanParagraph(page) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    const beforeCount = (await lastComponentInfo(page)).count;

    // 직전 시도가 "인용구 버튼 클릭"까지는 성공했는데(렌더 지연으로 실패로 오판해 재시도
    // 하는 바람에) 빈 인용구가 이미 하나 남아 있을 수 있다 — 그럴 땐 또 새로 만들지 말고
    // 이미 있는 그 빈 인용구를 그대로 "본문"으로 바꾼다.
    const alreadyEmptyQuote = await page.evaluate(() => {
      const comps = [...document.querySelectorAll('.se-component')];
      const last = comps[comps.length - 1];
      if (!last || !last.className.includes('se-quotation')) return false;
      const quoteText = last.querySelector('.se-quote')?.textContent?.trim() || '';
      return quoteText === '' || quoteText === '내용을 입력하세요.';
    });

    if (!alreadyEmptyQuote) {
      const quoteBtn = page.locator('.se-insert-quotation-default-toolbar-button');
      await quoteBtn.click({ force: true });
      // 클릭이 반영됐는지 최대 1.5초 폴링 — 단발성 체크는 렌더 지연 때문에 가짜 실패로 잡혔다(실측 확인).
      let afterQuoteClick = await lastComponentInfo(page);
      for (let poll = 0; poll < 6 && afterQuoteClick.count !== beforeCount + 1; poll++) {
        await page.waitForTimeout(250);
        afterQuoteClick = await lastComponentInfo(page);
      }
      if (process.env.NA_DEBUG) console.log(`  [landOnCleanParagraph ${attempt}] 인용구버튼 클릭 후 count ${beforeCount}->${afterQuoteClick.count}`);
      if (afterQuoteClick.count !== beforeCount + 1) {
        await page.waitForTimeout(300);
        continue;
      }
    } else if (process.env.NA_DEBUG) {
      console.log(`  [landOnCleanParagraph ${attempt}] 직전 시도의 빈 인용구를 재활용`);
    }
    const expectedCount = alreadyEmptyQuote ? beforeCount : beforeCount + 1;
    await page.locator('.se-text-format-toolbar-button').first().click({ force: true });
    await page.waitForTimeout(300);
    await page.locator('.se-toolbar-option-text-format-text-button').first().click({ force: true });
    await page.waitForTimeout(400);

    // 센티넬로 실제 착지 지점을 검증
    await page.keyboard.type('##SENTINEL##', { delay: 10 });
    await page.waitForTimeout(300);
    const info = await lastComponentInfo(page);
    if (process.env.NA_DEBUG) console.log(`  [landOnCleanParagraph ${attempt}] 최종 info=`, JSON.stringify(info).slice(0, 200));
    const landedOk = info.count === expectedCount
      && info.cls.includes('se-text')
      && !info.cls.includes('se-quotation')
      && info.text.trim() === '##SENTINEL##';
    if (landedOk) {
      for (let i = 0; i < '##SENTINEL##'.length; i++) await page.keyboard.press('Backspace');
      await page.waitForTimeout(150);
      return;
    }
    const cur = await lastComponentInfo(page);
    if (cur.text && cur.text.includes('##SENTINEL##')) {
      for (let i = 0; i < '##SENTINEL##'.length; i++) await page.keyboard.press('Backspace');
    }
    await page.waitForTimeout(300);
  }
  throw new Error('landOnCleanParagraph: 깨끗한 문단으로 못 빠져나왔다 — 수동 확인 필요');
}

export async function insertQuote(page, text) {
  await page.locator('.se-insert-quotation-default-toolbar-button').click();
  await page.waitForTimeout(500);
  await page.keyboard.type(text, { delay: 15 });
  await page.waitForTimeout(500);
  await landOnCleanParagraph(page);
}

export async function insertImage(page, filePath) {
  const fcPromise = page.waitForEvent('filechooser', { timeout: 8000 });
  await page.locator('.se-image-toolbar-button').click();
  const fc = await fcPromise;
  await fc.setFiles(filePath);
  await page.waitForTimeout(3000);
  await landOnCleanParagraph(page);
}

export async function screenshotFull(page, outPath) {
  await page.screenshot({ path: outPath, fullPage: true });
}

// 사진을 한 번이라도 넣으면 그 사진의 "떠있는 편집 툴바"(se-flayer-unified-toolbar)가
// 페이지에 영구히 남는다 — Escape로도 안 닫히고, 그 뒤로 화면 아무 데나(문서 맨 아래
// 포함) 클릭할 때마다 계속 끼어들어 포커스를 가로챈다(실측 확인, 2026-09-14).
// DOM에서 그냥 지워버리는 게 유일하게 확실한 해결책이다 — 이 프로젝트 UI가 아니라
// 네이버 쪽 잔재라 기능상 잃는 건 없다.
export async function removeFloatingToolbars(page) {
  return await page.evaluate(() => {
    const els = document.querySelectorAll('.se-flayer-unified-toolbar, .se-floating-material-container');
    els.forEach(e => e.remove());
    return els.length;
  });
}

// 맨 끝 OG링크 카드. 문서 마지막 문단에 커서를 두고 URL을 타이핑 → Enter로 자동 임베드 →
// 썸네일 카드(se-l-large_image)를 텍스트 카드(se-l-text)로 바꾸고 → 카드 위에 남는 원본
// URL 텍스트 줄을 지운다(naver-cafe-news.md 5절 그대로, 자동화 버전).
export async function insertClosingLink(page, url) {
  await removeFloatingToolbars(page);
  const comps = await page.locator('.se-component').all();
  const lastComp = comps[comps.length - 1];
  const paras = await lastComp.locator('.se-text-paragraph').all();
  await paras[paras.length - 1].click();
  await page.waitForTimeout(200);
  await page.keyboard.press('End');
  await page.waitForTimeout(200);
  await page.keyboard.type(url, { delay: 15 });
  await page.waitForTimeout(300);

  // 타이핑이 실제로 반영됐는지 확인 — 안 됐으면 다시 시도(포커스 유실은 이 에디터 전반의
  // 고질적 문제, safeType과 같은 이유).
  let landed = false;
  for (let attempt = 1; attempt <= 3 && !landed; attempt++) {
    const text = await page.evaluate(() => document.querySelectorAll('.se-component').length
      ? [...document.querySelectorAll('.se-component')].at(-1).textContent : '');
    landed = text.includes(url);
    if (!landed) {
      const comps2 = await page.locator('.se-component').all();
      const lastComp2 = comps2[comps2.length - 1];
      const paras2 = await lastComp2.locator('.se-text-paragraph').all();
      await paras2[paras2.length - 1].click();
      await page.waitForTimeout(200);
      await page.keyboard.press('End');
      await page.keyboard.type(url, { delay: 15 });
      await page.waitForTimeout(300);
    }
  }
  if (!landed) throw new Error('insertClosingLink: URL 타이핑이 반영되지 않았다');

  await page.keyboard.press('Enter');
  await page.waitForTimeout(4000); // 링크 카드 자동 임베드 대기

  // 썸네일 삭제 → se-l-text 로 전환
  const delBtn = page.getByText('이미지 썸네일 삭제', { exact: true });
  if (await delBtn.count()) {
    await delBtn.first().click();
    await page.waitForTimeout(500);
  }

  // 카드 위에 남은 원본 URL 텍스트 줄 삭제. 이 문단은 문서 맨 끝에서 두 번째 컴포넌트다
  // (카드 자체가 마지막 컴포넌트로 새로 생겼으므로). Home/Shift+Home 이 이 특정 위치에서
  // 안 먹힐 때가 있어(실측 확인) 글자수만큼 Backspace 를 반복하는 방식을 쓴다.
  const compsAfter = await page.locator('.se-component').all();
  const textCompBeforeLink = compsAfter[compsAfter.length - 2];
  const parasAfter = await textCompBeforeLink.locator('.se-text-paragraph').all();
  const lastPara = parasAfter[parasAfter.length - 1];
  const leftover = (await lastPara.textContent()) || '';
  if (leftover.includes(url)) {
    await lastPara.click();
    await page.keyboard.press('End');
    await page.waitForTimeout(200);
    for (let i = 0; i < url.length; i++) await page.keyboard.press('Backspace');
    await page.waitForTimeout(200);
    await page.keyboard.press('Backspace'); // 빈 줄 병합
    await page.waitForTimeout(200);
  }
}

// DOM 텍스트 매칭으로 "등록" 버튼을 찾아 누른다 — 화면 좌표 클릭은 바로 아래 서체
// 드롭다운을 잘못 여는 함정이 있다(naver-cafe-news.md 7절). 게시 성공 여부는 URL이
// /write 를 벗어났는지로 판단한다.
export async function submit(page) {
  const before = page.url();
  const clicked = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button,a,[role="button"]')]
      .find(e => e.innerText.trim() === '등록' && e.getBoundingClientRect().width > 0);
    if (!b) return false;
    b.click();
    return true;
  });
  if (!clicked) throw new Error('submit: 등록 버튼을 못 찾았다');
  await page.waitForTimeout(3000);
  const after = page.url();
  if (after === before || after.includes('/write')) {
    throw new Error('submit: 게시 확인 실패 — URL이 그대로다: ' + after);
  }
  const m = after.match(/articleid[=%]3D?(\d+)|articleid=(\d+)/);
  return { url: after, articleId: m ? (m[1] || m[2]) : null };
}
