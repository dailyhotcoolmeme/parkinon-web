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
        // 목록에 붙는 소분류 라벨 (예: 산정특례, 낙상 예방)
        tag: z.string(),
        publishedAt: z.coerce.date(),
        // 글 상단 사진. 인물 사진은 쓰지 않는다(오너 지시 2026-08-06)
        hero: image(),
        heroAlt: z.string(),
        // 세 줄 요약 — 바쁜 사람은 여기까지만 읽어도 되게
        summary: z.array(z.string()).min(1).max(4),
        // 제도 글 필수: "2026년 7월 기준" 같은 표기
        basisDate: z.string().optional(),
        // 출처 — 기관 문서명과 링크. 제도 글은 반드시 하나 이상
        sources: z
          .array(z.object({ name: z.string(), url: z.url().optional() }))
          .optional(),
        contact: z.string().optional(),
        hashtags: z.array(z.string()).default([]),
        draft: z.boolean().default(false),
      }),
  }),
};
