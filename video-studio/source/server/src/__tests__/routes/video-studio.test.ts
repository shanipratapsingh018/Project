import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import { once } from 'node:events';
import { createApp } from '../../app.js';
import { initDb, getDb } from '../../db/index.js';
import { encrypt } from '../../lib/crypto.js';
import { mintDashboardToken } from '../helpers/auth.js';
import { MediaError } from '../../services/media.js';

const { generate } = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock('../../services/media.js', async importOriginal => ({
  ...await importOriginal<typeof import('../../services/media.js')>(), runVideoGeneration: generate,
}));

let server: Server;
let base: string;
let token: string;
let modelId: number;
const fixture = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypisom'), Buffer.alloc(20)]);
function call(path: string, body?: unknown, authenticated = true) {
  return fetch(`${base}/api/video-studio${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
function addKey() {
  const { encrypted, iv, authTag } = encrypt('fictional-provider-key');
  getDb().prepare("INSERT INTO api_keys (platform,label,encrypted_key,iv,auth_tag,status,enabled) VALUES ('novai','test',?,?,?,'healthy',1)").run(encrypted, iv, authTag);
}
beforeEach(async () => {
  process.env.ENCRYPTION_KEY = '0'.repeat(64);
  initDb(':memory:');
  token = mintDashboardToken();
  modelId = Number(getDb().prepare("INSERT INTO media_models (platform,model_id,display_name,modality,enabled) VALUES ('novai','cogvideox-flash','Test model','video',1)").run().lastInsertRowid);
  generate.mockReset();
  server = createApp().listen(0, '127.0.0.1');
  if (!server.listening) await once(server, 'listening');
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterEach(async () => {
  await new Promise<void>(resolve => server.close(() => resolve()));
});

describe('private realistic video studio', () => {
  it('requires a dashboard session for the catalog and generation', async () => {
    expect((await call('/models', undefined, false)).status).toBe(401);
    expect((await call('/generations', { modelId, prompt: 'A stream' }, false)).status).toBe(401);
    expect(generate).not.toHaveBeenCalled();
  });
  it('distinguishes a catalog entry from configured provider access', async () => {
    let response = await (await call('/models')).json();
    expect(response.models[0]).toMatchObject({ id: modelId, hasKey: false, enabled: true });
    addKey(); response = await (await call('/models')).json();
    expect(response.models[0].hasKey).toBe(true);
    expect(JSON.stringify(response)).not.toContain('fictional-provider-key');
  });
  it('does not call a provider without a key or for disabled models', async () => {
    expect((await call('/generations', { modelId, prompt: 'A stream' })).status).toBe(409);
    addKey(); getDb().prepare('UPDATE media_models SET enabled=0').run();
    expect((await call('/generations', { modelId, prompt: 'A stream' })).status).toBe(409);
    expect(generate).not.toHaveBeenCalled();
  });
  it.each([
    { prompt: '' }, { prompt: 'x'.repeat(8001) }, { prompt: 'Scene', aspectRatio: '1:1' },
    { prompt: 'Scene', duration: 200 }, { prompt: 'Scene', duration: 5.5 },
    { prompt: 'Scene', baseUrl: 'https://example.test' },
  ])('rejects malformed generation input %j', async input => {
    addKey(); expect((await call('/generations', { modelId, ...input })).status).toBe(400);
    expect(generate).not.toHaveBeenCalled();
  });
  it('enforces the fixed NovAI duration and frame before spending quota', async () => {
    addKey();
    expect((await call('/generations', { modelId, prompt: 'A stream', duration: 8 })).status).toBe(400);
    expect((await call('/generations', { modelId, prompt: 'A stream', aspectRatio: '9:16' })).status).toBe(400);
    expect(generate).not.toHaveBeenCalled();
  });
  it('returns a completed MP4 with actual provider metadata and no credentials', async () => {
    addKey(); generate.mockResolvedValue({ video: fixture, platform: 'novai', modelId: 'cogvideox-flash', contentType: 'video/mp4' });
    const response = await call('/generations', { modelId, prompt: '  A stream  ', duration: 5, aspectRatio: '16:9' });
    expect(response.status).toBe(200); expect(response.headers.get('content-type')).toContain('video/mp4');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-provider')).toBe('novai');
    expect(Buffer.from(await response.arrayBuffer())).toEqual(fixture);
    expect(generate).toHaveBeenCalledWith('cogvideox-flash', { prompt: 'A stream', duration: 5, aspectRatio: '16:9' }, expect.any(AbortSignal));
  });
  it('never treats HTML or an empty body as a video', async () => {
    addKey(); generate.mockResolvedValue({ video: Buffer.from('<html>provider error</html>'), platform: 'novai', modelId: 'test' });
    const response = await call('/generations', { modelId, prompt: 'A stream' });
    expect(response.status).toBe(502); expect(response.headers.get('content-type')).toContain('application/json');
  });
  it('reports quota failure without echoing upstream text or retrying', async () => {
    addKey(); generate.mockRejectedValue(new MediaError('secret-provider-key in private upstream URL', 429));
    const response = await call('/generations', { modelId, prompt: 'A stream' });
    expect(response.status).toBe(429); const body = await response.text();
    expect(body).toContain('quota'); expect(body).not.toContain('secret-provider-key'); expect(generate).toHaveBeenCalledTimes(1);
  });
  it('prevents concurrent requests from the same account', async () => {
    addKey(); let finish!: (value: unknown) => void;
    generate.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const first = call('/generations', { modelId, prompt: 'A stream' });
    await vi.waitFor(() => expect(generate).toHaveBeenCalledTimes(1));
    expect((await call('/generations', { modelId, prompt: 'Another scene' })).status).toBe(409);
    finish({ video: fixture, platform: 'novai', modelId: 'test', contentType: 'video/mp4' });
    expect((await first).status).toBe(200);
  });
  it('aborts provider work when the browser disconnects', async () => {
    addKey(); let providerSignal!: AbortSignal;
    generate.mockImplementation((_model, _params, signal: AbortSignal) => {
      providerSignal = signal;
      return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new MediaError('aborted', 499)), { once: true }));
    });
    const controller = new AbortController();
    const pending = fetch(`${base}/api/video-studio/generations`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ modelId, prompt: 'A stream' }), signal: controller.signal,
    }).catch(() => null);
    await vi.waitFor(() => expect(generate).toHaveBeenCalledTimes(1));
    controller.abort(); await pending;
    await vi.waitFor(() => expect(providerSignal.aborted).toBe(true));
  });
});
