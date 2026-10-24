// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const verifyIdToken = vi.fn();
vi.mock('firebase-admin/app', () => ({ cert: (x) => x, getApps: () => [{}], initializeApp: () => {} }));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({ verifyIdToken }) }));

const { handler, parseRequest } = await import('../functions/blog-ai-draft.js');

const post = (body, headers = {}) => ({ httpMethod: 'POST', headers: { authorization: 'Bearer tok', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const goodReply = { content: [{ type: 'text', text: JSON.stringify({ title: 'T', sections: [{ heading: 'H', paragraphs: ['P'], productId: 'p1' }, { heading: 'G', paragraphs: ['Q'], productId: 'invented' }] }) }] };

let fetchMock;
beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = 'test-key';
  process.env.VITE_FIREBASE_DATABASE_URL = 'https://db.test';
  verifyIdToken.mockReset().mockResolvedValue({ uid: `admin-${Math.random()}`, admin: true });
  fetchMock = vi.fn(async (url) => {
    if (String(url).startsWith('https://db.test/adminProducts/p1')) return { ok: true, json: async () => ({ name: 'Rider Jacket', price: 1000, category: 'Jackets' }) };
    if (String(url).startsWith('https://db.test/')) return { ok: true, json: async () => null };
    return { ok: true, status: 200, json: async () => goodReply };
  });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.ANTHROPIC_API_KEY;
});

describe('blog-ai-draft', () => {
  it('does nothing and calls no one when no API key is configured', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const res = await handler(post({ productIds: ['p1'] }));
    expect(res.statusCode).toBe(503);
    expect(JSON.parse(res.body).error).toBe('ai_not_configured');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it('only accepts POST', async () => {
    expect((await handler({ httpMethod: 'GET', headers: {} })).statusCode).toBe(405);
  });

  it('requires a valid sign-in', async () => {
    expect((await handler(post({}, { authorization: '' }))).statusCode).toBe(401);
    verifyIdToken.mockRejectedValueOnce(new Error('bad token'));
    expect((await handler(post({}))).statusCode).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a signed-in customer who is not a super user', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'c1', customer: true });
    expect((await handler(post({}))).statusCode).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('builds the prompt from catalogue data read on the server and drops product ids the model invented', async () => {
    const res = await handler(post({ type: 'multi', topic: 'Top picks', productIds: ['p1', 'nope'] }));
    expect(res.statusCode).toBe(200);
    const { draft } = JSON.parse(res.body);
    expect(draft.sections.map((s) => s.productId)).toEqual(['p1', '']);
    const call = fetchMock.mock.calls.find(([url]) => String(url).startsWith('https://api.anthropic.com'));
    const sent = JSON.parse(call[1].body);
    expect(call[1].headers['x-api-key']).toBe('test-key');
    expect(sent.system).toMatch(/Never invent/);
    expect(sent.messages[0].content).toContain('Rider Jacket');
    expect(sent.messages[0].content).toContain('"price_inr": 1000');
  });

  it('ignores any product facts the client tries to supply', async () => {
    await handler(post({ productIds: ['p1'], products: [{ id: 'p1', name: 'FAKE PRODUCT', price: 1 }] }));
    const call = fetchMock.mock.calls.find(([url]) => String(url).startsWith('https://api.anthropic.com'));
    expect(call[1].body).not.toContain('FAKE PRODUCT');
  });

  it('validates the request', async () => {
    expect((await handler(post('not json'))).statusCode).toBe(400);
    expect((await handler(post({ productIds: Array.from({ length: 20 }, (_, i) => `p${i}`) }))).statusCode).toBe(400);
    expect((await handler(post({ collectionId: '../x' }))).statusCode).toBe(400);
    expect((await handler(post('x'.repeat(30000)))).statusCode).toBe(413);
  });

  it('reports provider failures and unreadable replies without leaking details', async () => {
    fetchMock.mockImplementation(async (url) => (String(url).startsWith('https://db.test') ? { ok: true, json: async () => null } : { ok: false, status: 529, json: async () => ({}) }));
    const failed = await handler(post({}));
    expect(failed.statusCode).toBe(502);
    expect(failed.body).not.toContain('test-key');
    fetchMock.mockImplementation(async (url) => (String(url).startsWith('https://db.test') ? { ok: true, json: async () => null } : { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: 'sorry, no' }] }) }));
    expect((await handler(post({}))).statusCode).toBe(502);
  });

  it('rate-limits one user', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'same-user', admin: true });
    let last;
    for (let i = 0; i < 22; i += 1) last = await handler(post({}));
    expect(last.statusCode).toBe(429);
  });
});

describe('parseRequest', () => {
  it('clamps text, dedupes ids and falls back for an unknown type', () => {
    const { value } = parseRequest(JSON.stringify({ type: 'nope', topic: 'x'.repeat(999), productIds: ['a', 'a', 'b c'] }));
    expect(value.type).toBe('general');
    expect(value.topic.length).toBe(300);
    expect(value.productIds).toEqual(['a']);
  });
});
