import { describe, it, expect } from 'vitest';
import { CHANNELS, classifyReferrer, getChannel } from './referrerChannels.js';

describe('classifyReferrer', () => {
  it.each([
    ['direct', 'direct'],
    ['', 'direct'],
    [undefined, 'direct'],
    ['l_instagram_com', 'instagram'],
    ['instagram', 'instagram'],
    ['ig', 'instagram'],
    ['m_facebook_com', 'facebook'],
    ['l_facebook_com', 'facebook'],
    ['fb', 'facebook'],
    ['api_whatsapp_com', 'whatsapp'],
    ['wa_me', 'whatsapp'],
    ['google_com', 'search'],
    ['google_co_in', 'search'],
    ['bing_com', 'search'],
    ['duckduckgo_com', 'search'],
    ['mail_google_com', 'email'],
    ['newsletter', 'email'],
    ['youtube_com', 'youtube'],
    ['youtu_be', 'youtube'],
    ['pinterest_com', 'pinterest'],
    ['t_co', 'twitter'],
    ['x_com', 'twitter'],
    ['twitter_com', 'twitter'],
    ['some_blog_example', 'other'],
  ])('%s -> %s', (label, channel) => {
    expect(classifyReferrer(label)).toBe(channel);
  });

  it('does not match a short token inside an unrelated longer host', () => {
    expect(classifyReferrer('fbi_gov_in_news')).toBe('other');
    expect(classifyReferrer('tata_com')).toBe('other');
    expect(classifyReferrer('example_x_company_in_india')).toBe('other');
  });

  it('is case-insensitive and trims', () => {
    expect(classifyReferrer('  L_Instagram_Com ')).toBe('instagram');
  });
});

describe('channels', () => {
  it('every classifier result has an icon and label', () => {
    for (const c of CHANNELS) {
      expect(c.icon).toBeTruthy();
      expect(c.label).toBeTruthy();
    }
  });

  it('falls back to "other" for an unknown id', () => {
    expect(getChannel('nope').id).toBe('other');
  });
});
