/*
 * "이 언어는 사람에게 보여줄 만큼 글이 있는가"를 한 곳에서 판단한다.
 *
 * ★ 왜 있나 (2026-09-02): 포르투갈어 골격(라우트·사전)을 먼저 배포했더니, 브라질에서
 *   접속한 사람이 **글이 0편인 빈 사이트**로 넘어갔다. 루트 자동 전환도, 대문도, 푸터
 *   언어 콤보박스도 전부 pt 를 정상적인 선택지로 보여주고 있었다. 골격만 있는 언어를
 *   드러내는 것은 영어로 보내는 것보다 나쁘다.
 *
 *   그래서 **콘텐츠가 있는 언어만** 언어 선택 UI 에 나오게 한다. 판단 기준을 사람이
 *   기억하는 목록이 아니라 실제 콘텐츠에서 끌어오므로, 글을 넣는 순간 자동으로 켜진다.
 *
 * ⚠️ 루트(`/`) 의 Pages Function 은 콘텐츠 컬렉션을 못 읽는다(정적 배포물 밖에서 돈다).
 *   그쪽 목록은 손으로 맞추고, `scripts/check-root-function-locales.mjs` 가 여기와
 *   어긋나지 않는지 검사한다.
 */
import { getCollection } from 'astro:content';

/** 초안이 아닌 글이 한 편이라도 있는 언어. */
export async function publishedLocales(): Promise<Set<string>> {
  const all = await getCollection('articles', (e) => !e.data.draft);
  return new Set(all.map((e) => e.id.split('/')[0]));
}
