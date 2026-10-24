// Behavioural check for the footer-text rules under settings/store, against the Realtime Database emulator.
//   node scripts/check-footer-rules.mjs
import { startEmulator } from './lib/rtdb-emulator.mjs';

const { call, expect, summary } = await startEmulator({ ns: 'a2z-footer-rules-check' });
const store = (extra) => ({ storeName: 'A2Z', ...extra });

await expect('anyone can read the store settings', true, () => call('GET', 'settings/store', 'anon'));
await expect('anon cannot write footer text', false, () => call('PUT', 'settings/store/siteFooterText', 'anon', 'hi'));
await expect('anon cannot write a page footer', false, () => call('PUT', 'settings/store/pageFooters/products', 'anon', 'hi'));
await expect('admin: site footer text', true, () => call('PUT', 'settings/store', 'admin', store({ siteFooterText: 'ok', productFooterText: 'ok', pageFooters: { products: 'Shop note', _home: 'Home' } })));
await expect('admin: a 501-character site footer', false, () => call('PUT', 'settings/store/siteFooterText', 'admin', 'x'.repeat(501)));
await expect('admin: a 500-character site footer', true, () => call('PUT', 'settings/store/siteFooterText', 'admin', 'x'.repeat(500)));
await expect('admin: a 501-character page footer', false, () => call('PUT', 'settings/store/pageFooters/products', 'admin', 'x'.repeat(501)));
await expect('admin: a page footer that is not a string', false, () => call('PUT', 'settings/store/pageFooters/products', 'admin', { a: 1 }));
await expect('admin: a page key with unsafe characters', false, () => call('PUT', 'settings/store/pageFooters/bad%20key', 'admin', 'x'));
await expect('admin: clear a page footer', true, () => call('DELETE', 'settings/store/pageFooters/products', 'admin'));
summary();
