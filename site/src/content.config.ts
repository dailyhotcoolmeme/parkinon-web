import { defineCollection } from 'astro:content';
import { z } from 'zod';
import { glob } from 'astro/loaders';

/*
 * 글 하나 = 마크다운(MDX) 파일 하나. (website-plan.md "글 저장 방식과 발행 흐름" 확정 사항)
 *
 * 폴더 이름이 카테고리다:
 *   src/content/articles/institutions/xxx.mdx  →  /ko/institutions/xxx
 *
 * 여기 schema 를 어기면 **빌드가 실패한다**. 실수로 기준일이나 출처를 빠뜨린 채
 * 배포되는 것을 막기 위한 것이다 — 특히 제도 글은 출처·기준일이 없으면 안 된다.
 */
export const collections = {
  articles: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/articles' }),
    schema: ({ image }) =>
      z.object({
        title: z.string(),
        // 목록·검색결과에 쓰는 한 줄 설명
        description: z.string(),
        // 목록에 붙는 소분류 라벨 (예: 산정특례, 낙상 예방) — 글마다 다 다를 수 있다
        tag: z.string(),
        /*
         * 허브 페이지 상단 필터탭이 거르는 기준. `tag` 보다 한 단계 위 묶음이다.
         * - 생활 요령: website-plan.md "생활 요령 — 글 목록 38편"의 5분류
         *   (질환 이해 / 시작하기 / 몸에서 일어나는 일 / 하루를 보내는 법 / 사람과 상황)
         * - 제도·지원: 제도 이름 자체가 이미 필터 단위라 `tag` 값을 그대로 쓴다(선택 안 씀)
         * 카테고리마다 기준이 달라 자유 문자열로 둔다. 필수는 아니다(소식처럼 탭이 없는
         * 카테고리는 안 씀).
         */
        section: z.string().optional(),
        publishedAt: z.coerce.date(),
        // 글 상단 사진. 인물 사진은 쓰지 않는다(오너 지시 2026-08-06)
        hero: image(),
        heroAlt: z.string(),
        /*
         * "함께 보면 좋은 글" 카드 썸네일용. 없으면 hero를 그대로 쓴다 — 생활 요령
         * 상세페이지 히어로가 모두 같은 사진(거실)으로 바뀌면서 관련 글 카드까지 전부
         * 같은 사진이 뜨는 문제가 생겨(오너 지적 2026-08-09) 본문 사진을 여기 따로
         * 지정해 구분한다.
         */
        thumbnail: image().optional(),
        // 세 줄 요약 — 바쁜 사람은 여기까지만 읽어도 되게
        summary: z.array(z.string()).min(1).max(4),
        // 제도 글 필수: "2026년 7월 기준" 같은 표기
        basisDate: z.string().optional(),
        // 출처 — 기관 문서명과 링크. 제도 글은 반드시 하나 이상
        sources: z
          .array(z.object({ name: z.string(), url: z.url().optional() }))
          .optional(),
        contact: z.string().optional(),
        /*
         * 글 하단 앱 추천 블록에 어떤 화면·문구를 보여줄지(오너 지시 2026-08-09: "약복용
         * 내용만 있는데 각 상세페이지 내용과 맞는 걸로 바꾸자"). 없으면 AppPromo.astro
         * 기본값(복약)을 그대로 쓴다 — 딱 맞는 화면이 없는 글은 비워둔다.
         */
        /*
         * "함께 보면 좋은 글" 직접 지정. 여기 적어두면 무조건 이 글을 우선 보여준다 —
         * 발행일·해시태그로 자동 추측하지 않고 실제로 내용이 맞는 글인지 직접 판단해서
         * 넣는다(오너 지적 2026-08-09: "글 본문이랑 맞는 글을 추천하라고. 그 방식은
         * 내가 어찌 아냐고" — 방식을 오너에게 묻지 말고 알아서 정확하게 만들 것).
         * 값은 slug(파일 이름, 카테고리 무관하게 같은 언어 안에서 찾는다).
         */
        related: z.array(z.string()).optional(),
        appFeature: z
          .enum([
            'effectTracking',
            'exercise',
            'record',
            'medRegistration',
            'family',
            'reminder',
            'familyDiary',
            'community',
          ])
          .optional(),
        /*
         * 앱 추천 블록 자체를 뺀다. 제도·지원처럼 앱 기능과 정직하게 연결되는 화면이
         * 하나도 없는 글에 기본값(복약 화면)을 억지로 보여주면 "본문과 안 맞는 앱추천"
         * 문제가 그대로 재현된다(오너 지적 2026-08-09). 진짜 안 맞을 때만 쓸 것 —
         * appFeature 를 비워두는 것과는 다르다(그건 기본값이 뜬다).
         */
        hideAppPromo: z.boolean().default(false),
        hashtags: z.array(z.string()).default([]),
        draft: z.boolean().default(false),
      }),
  }),
};
