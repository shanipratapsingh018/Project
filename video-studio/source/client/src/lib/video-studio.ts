export interface StudioModel {
  id: number
  modelId: string
  name: string
  platform: string
  enabled: boolean
  hasKey: boolean
  quota: string | null
}

export const VIDEO_EXAMPLES = [
  { name: 'Workshop', scene: 'A mechanic wearing navy work clothes slowly checks the oil dipstick of a silver hatchback in a clean Indian car workshop. The car is stationary and its engine is off.' },
  { name: 'Nature', scene: 'A shallow stream flows over small dark stones in a green forest. Water ripples naturally around the rocks while leaves move gently in the background.' },
  { name: 'Product', scene: 'A handmade cream ceramic cup sits on a wooden table beside a window. A thin wisp of steam rises gently from the hot tea.' },
]

export const CAMERA_LOOKS = {
  still: 'Locked-off tripod shot, 50mm lens, natural depth of field.',
  push: 'One slow, steady camera push-in, 50mm lens, natural depth of field.',
  track: 'A gentle lateral tracking shot, 35mm lens, stable framing.',
}

export const LIGHTING_LOOKS = {
  daylight: 'Soft natural daylight, realistic shadows and neutral colour balance.',
  golden: 'Warm late-afternoon sunlight, soft highlights and realistic shadows.',
  studio: 'Soft diffused studio lighting, controlled reflections and neutral colour balance.',
}

export function buildVideoPrompt(scene: string, camera: keyof typeof CAMERA_LOOKS, lighting: keyof typeof LIGHTING_LOOKS): string {
  return [scene.trim(), CAMERA_LOOKS[camera], LIGHTING_LOOKS[lighting],
    'Photorealistic live-action footage. One continuous shot with one main action, natural motion, physically plausible details and consistent subjects. No captions, logos or watermarks.'].join('\n\n')
}

export function videoErrorMessage(status: number): string {
  if (status === 401 || status === 403) return 'Check your sign-in and the provider’s video access on the Keys page.'
  if (status === 429) return 'The provider limit was reached. Check your video quota before retrying.'
  if (status === 504) return 'The request timed out. Check the provider’s job history before retrying; quota may have been used.'
  return 'The video could not be completed. Your scene is still here. Check the provider and try again when it is available.'
}
