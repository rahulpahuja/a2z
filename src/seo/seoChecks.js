// Guidance shown on Super User > Page SEO. Pure, so it is unit tested and the ranges live
// in one place. These are widely used rules of thumb for how much of a title/description a
// search result usually shows — not guarantees about rankings or what any engine displays.

export const TITLE_RANGE = { min: 30, max: 60 };
export const DESCRIPTION_RANGE = { min: 70, max: 160 };

const norm = (value) => String(value ?? '').trim().toLowerCase();

function lengthCheck(id, label, text, range) {
  const length = text.length;
  if (length === 0) return { id, level: 'bad', message: `${label} is empty.` };
  if (length < range.min) {
    return { id, level: 'warn', message: `${label} is short (${length} characters). Aim for ${range.min}–${range.max} so it uses the space in search results.` };
  }
  if (length > range.max) {
    return { id, level: 'warn', message: `${label} is long (${length} characters) and is likely to be cut off after about ${range.max}.` };
  }
  return { id, level: 'good', message: `${label} length is good (${length} characters).` };
}

// `effective*` is what the page will actually use (custom value, else the built-in default).
// `others` is the effective {title, description} of every other page, to catch duplicates.
export function analyzeSeo({ effectiveTitle, effectiveDescription, brand, metaTags = [], others = [], noindexByDefault = false }) {
  const title = String(effectiveTitle ?? '').trim();
  const description = String(effectiveDescription ?? '').trim();
  const checks = [];

  checks.push(lengthCheck('title-length', 'Title', title, TITLE_RANGE));
  checks.push(lengthCheck('description-length', 'Description', description, DESCRIPTION_RANGE));

  if (brand && title && !norm(title).includes(norm(brand))) {
    checks.push({ id: 'brand', level: 'warn', message: `The title does not mention "${brand}". Adding the brand (usually at the end) helps people recognise the result.` });
  }

  const duplicateTitle = others.find((o) => title && norm(o.title) === norm(title));
  checks.push(
    duplicateTitle
      ? { id: 'title-unique', level: 'bad', message: `Another page already uses this exact title (${duplicateTitle.path}). Each page should have its own.` }
      : { id: 'title-unique', level: 'good', message: 'The title is unique among your pages.' }
  );

  const duplicateDescription = others.find((o) => description && norm(o.description) === norm(description));
  checks.push(
    duplicateDescription
      ? { id: 'description-unique', level: 'warn', message: `Another page uses this exact description (${duplicateDescription.path}). Write one that describes only this page.` }
      : { id: 'description-unique', level: 'good', message: 'The description is unique among your pages.' }
  );

  if (/[|\-–—]\s*$/.test(title) || /\s{2,}/.test(title)) {
    checks.push({ id: 'title-format', level: 'warn', message: 'The title has a trailing separator or repeated spaces.' });
  }

  const letters = title.replace(/[^A-Za-z]/g, '');
  if (letters.length > 8 && letters === letters.toUpperCase()) {
    checks.push({ id: 'title-caps', level: 'warn', message: 'The title is all capitals, which reads as shouting and is harder to scan.' });
  }

  const hasOgImage = metaTags.some((t) => t.attr === 'property' && norm(t.key) === 'og:image' && String(t.content ?? '').trim());
  checks.push(
    hasOgImage
      ? { id: 'og-image', level: 'good', message: 'A custom og:image is set, so shared links use your picture.' }
      : { id: 'og-image', level: 'info', message: 'No custom og:image on this page. Add one (about 1200×630px) to control the preview when the page is shared.' }
  );

  const robots = metaTags.find((t) => t.attr === 'name' && norm(t.key) === 'robots');
  if (robots && /noindex/i.test(robots.content)) {
    checks.push({ id: 'robots', level: 'warn', message: 'A robots "noindex" tag is set, so search engines are told to leave this page out of results.' });
  } else if (noindexByDefault) {
    checks.push({ id: 'robots', level: 'info', message: 'This page is not indexed by default, so its title and description only matter for browser tabs and shared links.' });
  }

  return checks;
}

export const SEO_TIPS = [
  { icon: 'title', title: 'Lead with what the page is', body: 'Put the main words a shopper would search for near the start of the title, and the brand last: “Co-ord Sets for Women | A2Z Collection”.' },
  { icon: 'straighten', title: 'Mind the lengths', body: `Keep titles to about ${TITLE_RANGE.min}–${TITLE_RANGE.max} characters and descriptions to ${DESCRIPTION_RANGE.min}–${DESCRIPTION_RANGE.max}. Longer text is usually truncated in results.` },
  { icon: 'fingerprint', title: 'Make every page unique', body: 'Duplicate titles and descriptions make pages compete with each other and give searchers no reason to pick one.' },
  { icon: 'ads_click', title: 'Write the description as an invitation', body: 'Say what the visitor gets and why to click: range, delivery across India, the Indore studio. A description does not directly set rankings, but it affects whether people click.' },
  { icon: 'block', title: 'Do not stuff keywords', body: 'Use natural wording. Repeating a phrase makes the title unreadable and does not help.' },
  { icon: 'location_on', title: 'Use your real location', body: 'Mention Indore or Madhya Pradesh where it is true (home, stores and contact pages) to help local searches.' },
  { icon: 'image', title: 'Control the share preview', body: 'Add an og:image (about 1200×630px) and og:title/og:description tags below so links shared on WhatsApp, Facebook and Instagram look right.' },
  { icon: 'link', title: 'Set a canonical only if needed', body: 'The site already adds a canonical URL for each page. Override it only when a page really duplicates another.' },
  { icon: 'visibility_off', title: 'Keep private pages out of search', body: 'Cart, checkout and account pages are already not indexed. Use a robots “noindex” meta tag for any other page you do not want in results.' },
  { icon: 'photo_library', title: 'Describe your images', body: 'Descriptive product names and image alt text help image search and accessibility. Compress images so pages load quickly.' },
  { icon: 'speed', title: 'Speed and mobile matter', body: 'Fast, mobile-friendly pages tend to do better and convert better. Check Core Web Vitals in Google Search Console.' },
  { icon: 'travel_explore', title: 'Submit and monitor', body: 'Submit your sitemap in Google Search Console and Bing Webmaster Tools, then watch which queries and pages get impressions before and after you change a title.' },
  { icon: 'schedule', title: 'Give changes time', body: 'Search engines recrawl on their own schedule, so a new title can take days or weeks to appear. Change one thing at a time to learn what works.' },
];
