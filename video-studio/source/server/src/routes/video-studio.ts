import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import { listAllMediaModels, MediaError, runVideoGeneration, VIDEO_PLATFORMS } from '../services/media.js';

export const videoStudioRouter = Router();
const activeUsers = new Set<number>();

function models() {
  const keys = new Set((getDb().prepare(
    "SELECT DISTINCT platform FROM api_keys WHERE enabled = 1 AND status IN ('healthy', 'unknown')",
  ).all() as { platform: string }[]).map(key => key.platform));
  return listAllMediaModels()
    .filter(model => model.modality === 'video' && VIDEO_PLATFORMS.has(model.platform))
    .map(model => ({
      id: model.id, modelId: model.model_id, name: model.display_name,
      platform: model.platform, enabled: model.enabled === 1,
      hasKey: keys.has(model.platform), quota: model.quota_label,
    }));
}

videoStudioRouter.get('/models', (_req, res) => res.json({ models: models() }));

const Generation = z.object({
  modelId: z.number().int().positive(),
  prompt: z.string().trim().min(1).max(8_000),
  duration: z.number().int().min(1).max(120).optional(),
  aspectRatio: z.enum(['16:9', '9:16']).optional(),
}).strict();

// This is an authenticated dashboard action, so no provider or unified API key
// needs to be copied into the browser. The existing media router owns provider
// calls, quota accounting, polling and request cancellation.
videoStudioRouter.post('/generations', async (req: Request, res: Response) => {
  const parsed = Generation.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { type: 'invalid_video_request', message: 'Choose a model, describe a scene, and use supported video settings.' } });
    return;
  }
  const model = models().find(item => item.id === parsed.data.modelId);
  if (!model?.enabled || !model.hasKey) {
    res.status(409).json({ error: { type: 'provider_not_configured', message: 'Enable a video model and connect its provider on the Keys page first.' } });
    return;
  }
  if (model.platform === 'novai' && (
    (parsed.data.duration !== undefined && parsed.data.duration !== 5)
    || (parsed.data.aspectRatio !== undefined && parsed.data.aspectRatio !== '16:9')
  )) {
    res.status(400).json({ error: { type: 'unsupported_video_settings', message: 'This NovAI model supports a five-second landscape clip. Use model defaults or 5 seconds and 16:9.' } });
    return;
  }
  const userId = (req as Request & { user: { userId: number } }).user.userId;
  if (activeUsers.has(userId)) {
    res.status(409).json({ error: { type: 'generation_in_progress', message: 'A video is already being generated for this account. Wait for it to finish.' } });
    return;
  }
  activeUsers.add(userId);
  const controller = new AbortController();
  let timedOut = false;
  let disconnected = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 300_000);
  res.on('close', () => {
    if (!res.writableEnded) { disconnected = true; controller.abort(); }
  });
  try {
    const result = await runVideoGeneration(model.modelId, {
      prompt: parsed.data.prompt, duration: parsed.data.duration,
      aspectRatio: parsed.data.aspectRatio,
    }, controller.signal);
    if (disconnected || timedOut) throw new MediaError('Video request ended', 504);
    if (result.video.length < 24 || result.video.length > 100 * 1024 * 1024
      || result.video.toString('ascii', 4, 8) !== 'ftyp') {
      throw new MediaError('Invalid video response', 502);
    }
    res.set({
      'Content-Type': 'video/mp4', 'Cache-Control': 'no-store',
      'X-Provider': encodeURIComponent(result.platform),
      'X-Model': encodeURIComponent(result.modelId),
    });
    res.send(result.video);
  } catch (error) {
    if (disconnected || res.writableEnded) return;
    const upstreamStatus = error instanceof MediaError ? error.status : 502;
    const status = timedOut ? 504 : [401, 403, 429, 504].includes(upstreamStatus) ? upstreamStatus : 502;
    const message = status === 401 || status === 403
      ? 'The video provider rejected access. Check its key and video permissions on the Keys page.'
      : status === 429
        ? 'The provider limit was reached. Check your remaining video quota before trying again.'
        : status === 504
          ? 'The provider did not finish within five minutes. Check its job history before retrying; quota may already have been used.'
          : 'The provider did not return a completed MP4. Check Logs and your provider account before retrying.';
    // Provider error text can contain URLs, credentials or user input. Return
    // actionable messages without echoing upstream response bodies.
    res.status(status).json({ error: { type: 'video_generation_failed', message } });
  } finally {
    clearTimeout(timer);
    activeUsers.delete(userId);
  }
});
