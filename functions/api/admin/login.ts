import { checkCredentials, issueToken, json, configError, type Ctx } from '../../_lib/adminAuth';

export const onRequestPost = async ({ request, env }: Ctx): Promise<Response> => {
  if (configError(env)) return json(503, { error: 'server config error' });
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'bad request' });
  }
  const ok = await checkCredentials(env, String(body.username || ''), String(body.password || ''));
  if (!ok) return json(401, { error: 'invalid credentials' });
  const token = await issueToken(env);
  return json(200, { token });
};
