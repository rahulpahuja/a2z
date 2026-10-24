// Behavioural check for the `shotStats` node of database.rules.json, against the Realtime Database
// emulator (see scripts/lib/rtdb-emulator.mjs).   node scripts/check-shot-rules.mjs
import { startEmulator } from './lib/rtdb-emulator.mjs';

const { call, expect, summary } = await startEmulator({ ns: 'a2z-shot-rules-check' });
const INC = (n) => ({ '.sv': { increment: n } });

console.log('--- reads');
await expect('anon: read all shot stats', true, () => call('GET', 'shotStats', 'anon'));

console.log('--- views');
await expect('anon: first view (+1 on a new shot)', true, () => call('PATCH', 'shotStats/prod_1_0', 'anon', { views: INC(1) }));
await expect('anon: second view (+1)', true, () => call('PATCH', 'shotStats/prod_1_0', 'anon', { views: INC(1) }));
await expect('anon: jump views by +5', false, () => call('PATCH', 'shotStats/prod_1_0', 'anon', { views: INC(5) }));
await expect('anon: decrease views', false, () => call('PATCH', 'shotStats/prod_1_0', 'anon', { views: INC(-1) }));
await expect('anon: set views to a fractional number', false, () => call('PUT', 'shotStats/prod_1_0/views', 'anon', 3.5));
await expect('anon: set views to a string', false, () => call('PUT', 'shotStats/prod_1_0/views', 'anon', '9'));
await expect('anon: new shot may not start above 1', false, () => call('PATCH', 'shotStats/prod_2_0', 'anon', { views: 1000 }));

console.log('--- likes');
await expect('anon: like a new shot (+1)', true, () => call('PATCH', 'shotStats/prod_1_0', 'anon', { likes: INC(1) }));
await expect('anon: unlike (-1)', true, () => call('PATCH', 'shotStats/prod_1_0', 'anon', { likes: INC(-1) }));
await expect('anon: unlike below zero', false, () => call('PATCH', 'shotStats/prod_1_0', 'anon', { likes: INC(-1) }));
await expect('anon: +10 likes at once', false, () => call('PATCH', 'shotStats/prod_1_0', 'anon', { likes: INC(10) }));
await expect('anon: unlike on a shot that has no likes node', false, () => call('PATCH', 'shotStats/prod_9_0', 'anon', { likes: INC(-1) }));

console.log('--- views and likes together (what update() could send)');
await expect('anon: +1 view and +1 like in one write', true, () => call('PATCH', 'shotStats/prod_3_0', 'anon', { views: INC(1), likes: INC(1) }));

console.log('--- shape');
await expect('anon: extra field', false, () => call('PATCH', 'shotStats/prod_1_0', 'anon', { shares: 1 }));
await expect('anon: replace the whole shot node', false, () => call('PUT', 'shotStats/prod_1_0', 'anon', { views: 99999, likes: 99999 }));
await expect('anon: delete a shot node', false, () => call('DELETE', 'shotStats/prod_1_0', 'anon'));
await expect('anon: bad shot id', false, () => call('PATCH', 'shotStats/bad$id', 'anon', { views: INC(1) }));
await expect('anon: overwrite the whole shotStats tree', false, () => call('PUT', 'shotStats', 'anon', { x: { views: 1 } }));

summary();
