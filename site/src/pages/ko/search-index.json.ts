import type { APIRoute } from 'astro';
import { buildArticleIndex } from '../../lib/searchIndex';

export const prerender = true;

export const GET: APIRoute = async () => {
  const items = await buildArticleIndex('ko');
  return new Response(JSON.stringify(items), { headers: { 'content-type': 'application/json' } });
};
