export function isAuthorized(request, env) {
  if (!env.APP_SHARED_KEY) return false;
  const header = request.headers.get('Authorization') || '';
  return header === `Bearer ${env.APP_SHARED_KEY}`;
}
