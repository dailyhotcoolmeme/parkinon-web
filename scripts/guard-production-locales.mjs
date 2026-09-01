#!/usr/bin/env node
/*
 * PreToolUse(Bash) 훅 — parkinon-web(프로덕션) 배포 명령을 가로채서, 배포 대상 디렉터리
 * 안에 "막아둔 언어" 폴더가 있으면 배포 자체를 차단한다.
 *
 * **지금 목록은 비어 있다 = 아무 언어도 막지 않는다(2026-09-01).** 애드센스가 8/30 에
 * parkinon.com 을 거절했고 재심사를 한참 뒤로 미루기로 하면서, 오너 지시로 en/ja/fr 을
 * 모두 열었다. 훅 자체는 남겨 둔다 — 재심사 준비 때 배열만 다시 채우면 바로 작동한다.
 *
 * ★왜 있나(2026-08-16, 오너 지시 "강력하게 조치해라. 훅으로도"): merge-deploy.mjs 가
 * 차단 언어를 복사에서 빼도록 고쳐 놨어도, 그건 "그 스크립트를 정확히 쓸 때만" 지켜지는
 * 규칙이다. 코드만 믿었다가 임상시험 검색 API·톱바 검색 배포 도중 다른 경로로 실수가
 * 반복된 적이 있다(BC카드 국내 전용 안내를 해외 언어에 번역해 넣은 사고와 같은 종류).
 * 훅은 Claude 가 규칙을 잊어도, 세션이 새로 시작돼도 계속 작동한다.
 *
 * 이 목록은 scripts/merge-deploy.mjs 의 BLOCKED_LOCALES 와 항상 같아야 한다 —
 * site/scripts/check-blocked-locales.mjs 가 네 곳을 함께 검사한다.
 */
const BLOCKED_LOCALES = [];

import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

let input = '';
process.stdin.on('data', (d) => (input += d));
process.stdin.on('end', () => {
  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    process.exit(0); // 입력을 못 읽으면 통과시킨다 — 훅이 배포 자체를 막아버리는 사고를 피한다
  }

  const command = payload?.tool_input?.command ?? '';
  if (payload?.tool_name !== 'Bash' || !command.includes('wrangler')) {
    process.exit(0);
  }
  // parkinon-web = 프로덕션(parkinon.com) 프로젝트. parkinon-site-dev 등 다른 프로젝트명은 대상 아님.
  if (!/--project-name[= ]parkinon-web\b/.test(command)) {
    process.exit(0);
  }
  if (!/pages\s+deploy/.test(command)) {
    process.exit(0);
  }

  // `wrangler pages deploy <디렉터리> ...` 에서 디렉터리(첫 위치 인자) 추출
  const m = command.match(/pages\s+deploy\s+(\S+)/);
  const dir = m?.[1];
  if (!dir) process.exit(0); // 디렉터리를 못 찾으면(예: --help 등) 통과

  const found = BLOCKED_LOCALES.filter((loc) => {
    const p = path.join(dir, loc);
    return existsSync(p) && readdirSync(p).length > 0;
  });

  if (found.length > 0) {
    const result = {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          `애드센스 심사 통과 전까지 parkinon-web(프로덕션) 배포에서 ${found.join(', ')} 언어가 차단돼 있습니다 ` +
          `(2026-08-16 오너 지시). 배포 대상(${dir}) 안에 이 언어 폴더가 남아 있어 막았습니다 — ` +
          `scripts/merge-deploy.mjs 가 en/ja/fr 을 빼고 merged-dist 를 만들었는지 확인하거나, ` +
          `정말 이 언어를 프로덕션에 올려도 된다고 오너가 명시적으로 확인해줬는지 다시 확인할 것.`,
      },
      decision: 'block',
      reason: `Blocked locales present in deploy target: ${found.join(', ')}`,
    };
    console.log(JSON.stringify(result));
    process.exit(0);
  }

  process.exit(0);
});
