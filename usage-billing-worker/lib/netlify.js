const API_BASE = 'https://api.netlify.com/api/v1';

async function netlifyGet(env, path) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${env.NETLIFY_ACCESS_TOKEN}` },
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(`Netlify API error (${path}): ${json.message || response.statusText}`);
  }
  return json;
}

export async function getNetlifyUsage(env) {
  if (!env.NETLIFY_ACCESS_TOKEN) throw new Error('NETLIFY_ACCESS_TOKEN not set');
  if (!env.NETLIFY_TEAM_SLUG) throw new Error('NETLIFY_TEAM_SLUG not set');

  const [accounts, accountTypes, bandwidth] = await Promise.all([
    netlifyGet(env, '/accounts'),
    netlifyGet(env, '/accounts/types'),
    netlifyGet(env, `/accounts/${env.NETLIFY_TEAM_SLUG}/bandwidth`),
  ]);

  const account = accounts.find((a) => a.slug === env.NETLIFY_TEAM_SLUG);
  const plan = accountTypes.find((t) => t.id === account?.type_id);

  const usedGb = bandwidth.used / 1e9;
  const includedGb = bandwidth.included / 1e9;

  return {
    team: env.NETLIFY_TEAM_SLUG,
    plan_name: account?.type_name ?? plan?.name ?? 'unknown',
    monthly_price_usd: plan?.monthly_dollar_price ?? null,
    bandwidth_used_gb: Number(usedGb.toFixed(3)),
    bandwidth_included_gb: Number(includedGb.toFixed(3)),
    bandwidth_period_start: bandwidth.period_start_date,
    bandwidth_period_end: bandwidth.period_end_date,
    note: 'Bandwidth overage cost isn’t included here — Netlify bills additional bandwidth per plan tier, not a flat public rate.',
  };
}
