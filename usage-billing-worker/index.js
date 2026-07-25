import { isAuthorized } from './lib/auth.js';
import { resolvePeriod } from './lib/period.js';
import { getR2Usage } from './lib/r2.js';
import { getMsg91Usage } from './lib/msg91.js';
import { getFirebaseUsage } from './lib/firebase.js';
import { getNetlifyUsage } from './lib/netlify.js';

function toResult(settled) {
  return settled.status === 'fulfilled' ? settled.value : { error: settled.reason?.message || String(settled.reason) };
}

export default {
  async fetch(request, env) {
    if (!isAuthorized(request, env)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const period = resolvePeriod(url);

    const [r2, msg91, firebase, netlify] = await Promise.allSettled([
      getR2Usage(env, period),
      getMsg91Usage(env),
      getFirebaseUsage(env, period),
      getNetlifyUsage(env),
    ]);

    const body = {
      generated_at: new Date().toISOString(),
      period: { start: period.start.toISOString(), end: period.end.toISOString() },
      r2: toResult(r2),
      msg91: toResult(msg91),
      firebase: toResult(firebase),
      netlify: toResult(netlify),
      shipprime: { status: 'pending', note: 'Not yet integrated.' },
    };

    return new Response(JSON.stringify(body, null, 2), {
      headers: { 'content-type': 'application/json' },
    });
  },
};
