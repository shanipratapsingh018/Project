import { describe, expect, it } from 'vitest'
import { buildVideoPrompt, VIDEO_EXAMPLES, videoErrorMessage } from './video-studio'

describe('realistic-video prompt and recovery', () => {
  it('preserves a user scene and adds one camera move with concrete lighting', () => {
    const prompt = buildVideoPrompt('  A stream flows over stones.  ', 'push', 'golden')
    expect(prompt.startsWith('A stream flows over stones.')).toBe(true)
    expect(prompt).toContain('slow, steady camera push-in')
    expect(prompt).toContain('Warm late-afternoon sunlight')
    expect(prompt).toContain('One continuous shot with one main action')
    expect(prompt).not.toContain('undefined')
  })
  it('supplies concrete workshop, nature and product starter scenes', () => {
    expect(VIDEO_EXAMPLES.map(example => example.name)).toEqual(['Workshop', 'Nature', 'Product'])
    for (const example of VIDEO_EXAMPLES) expect(example.scene.length).toBeGreaterThan(70)
  })
  it('handles quota and uncertain timeout without promising a free retry', () => {
    expect(videoErrorMessage(429)).toContain('quota')
    expect(videoErrorMessage(504)).toContain('job history')
    expect(videoErrorMessage(502)).toContain('scene is still here')
  })
})
