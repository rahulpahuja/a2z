// Groups the raw referrer labels recorded with each product view (see getReferrerLabel in
// services/productStats.js: a sanitized hostname such as `l_instagram_com`, a lower-cased
// `utm_source`, or `direct`) into the channels shown on the Analytics page.

export const CHANNELS = [
  { id: 'direct', label: 'Direct', icon: 'link' },
  { id: 'search', label: 'Search', icon: 'search' },
  { id: 'instagram', label: 'Instagram', icon: 'photo_camera' },
  { id: 'facebook', label: 'Facebook', icon: 'thumb_up' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'chat' },
  { id: 'youtube', label: 'YouTube', icon: 'smart_display' },
  { id: 'pinterest', label: 'Pinterest', icon: 'push_pin' },
  { id: 'twitter', label: 'X / Twitter', icon: 'alternate_email' },
  { id: 'email', label: 'Email', icon: 'mail' },
  { id: 'other', label: 'Other sites', icon: 'public' },
  // Views recorded before referrers were tracked, so they have no source.
  { id: 'unattributed', label: 'Unattributed', icon: 'help' },
];

const CHANNEL_BY_ID = new Map(CHANNELS.map((c) => [c.id, c]));

export function getChannel(id) {
  return CHANNEL_BY_ID.get(id) ?? CHANNEL_BY_ID.get('other');
}

// Ordered rules; the first match wins. Email comes before search so `mail_google_com`
// is not mistaken for Google Search. Matching is on whole `_`-separated tokens so
// e.g. `fb` matches `m_fb_com` but not `fbi_gov`.
const RULES = [
  { id: 'email', tokens: ['mail', 'email', 'newsletter', 'outlook', 'gmail', 'mailchimp'] },
  { id: 'instagram', tokens: ['instagram', 'insta', 'ig'] },
  { id: 'facebook', tokens: ['facebook', 'fb', 'meta'] },
  { id: 'whatsapp', tokens: ['whatsapp', 'wa'] },
  { id: 'youtube', tokens: ['youtube', 'youtu', 'yt'] },
  { id: 'pinterest', tokens: ['pinterest', 'pin'] },
  { id: 'twitter', tokens: ['twitter', 'x', 't'] },
  { id: 'search', tokens: ['google', 'bing', 'duckduckgo', 'yahoo', 'ecosia', 'baidu', 'yandex', 'search'] },
];

// `t` and `x` are only meaningful as a whole host (t.co, x.com), not as any token.
const EXACT_ONLY = new Set(['t', 'x', 'wa', 'ig', 'fb', 'yt', 'pin', 'meta']);

export function classifyReferrer(label) {
  const key = String(label ?? '').trim().toLowerCase();
  if (!key || key === 'direct') return 'direct';
  const tokens = key.split('_').filter(Boolean);
  for (const rule of RULES) {
    const hit = rule.tokens.some((token) => {
      if (EXACT_ONLY.has(token)) return tokens.includes(token) && tokens.length <= 3;
      return tokens.includes(token);
    });
    if (hit) return rule.id;
  }
  return 'other';
}
