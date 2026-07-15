const STORAGE_KEY = 'a2z_bot_flag';

// Legitimate search engines / link-preview bots we want to keep letting through
// so SEO indexing and social link previews keep working.
const ALLOWLISTED_BOT_UA = /googlebot|bingbot|applebot|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|slackbot|linkedinbot|telegrambot|whatsapp/i;

// Known scraping tools, HTTP libraries, and headless-automation frameworks.
const BLOCKED_BOT_UA = /headlesschrome|phantomjs|selenium|puppeteer|playwright|scrapy|curl|wget|python-requests|python-urllib|node-fetch|go-http-client|java\/|libwww-perl|httpclient|okhttp|aiohttp|postmanruntime|insomnia|bot|crawler|spider|scraper/i;

function hasWebdriverFlag() {
  return typeof navigator !== 'undefined' && navigator.webdriver === true;
}

function looksHeadless() {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
  const noPlugins = (navigator.plugins?.length ?? 0) === 0;
  const noLanguages = (navigator.languages?.length ?? 0) === 0;
  const chromeUA = /chrome/i.test(navigator.userAgent) && !/edg|opr/i.test(navigator.userAgent);
  const missingChromeObject = chromeUA && typeof window.chrome === 'undefined';
  return (noPlugins && noLanguages) || missingChromeObject;
}

export function flagAsBot(reason) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ flagged: true, reason, at: Date.now() }));
  } catch {
    // ignore storage failures (e.g. private mode)
  }
}

function readFlag() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Best-effort client-side signal — a determined scraper that spoofs its
// user agent and automation fingerprints, or simply never executes JS, will
// not be stopped by this alone. Real enforcement belongs at the edge/WAF
// (e.g. Cloudflare Bot Management) in front of this static site.
export function getBotVerdict() {
  const previouslyFlagged = readFlag();
  if (previouslyFlagged?.flagged) {
    return { blocked: true, reason: previouslyFlagged.reason || 'previously-flagged' };
  }

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';

  if (ALLOWLISTED_BOT_UA.test(ua)) {
    return { blocked: false, reason: 'allowlisted-crawler' };
  }
  if (BLOCKED_BOT_UA.test(ua)) {
    return { blocked: true, reason: 'blocked-user-agent' };
  }
  if (hasWebdriverFlag()) {
    return { blocked: true, reason: 'webdriver-flag' };
  }
  if (looksHeadless()) {
    return { blocked: true, reason: 'headless-heuristics' };
  }
  return { blocked: false, reason: 'ok' };
}
