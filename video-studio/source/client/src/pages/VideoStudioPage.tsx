import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight, Camera, Check, Clapperboard, Copy, Download, KeyRound, LoaderCircle, RefreshCw, Square } from 'lucide-react'
import { API_BASE, apiFetch, clearToken, getToken, UNAUTHORIZED_EVENT } from '@/lib/api'
import { copyText } from '@/lib/clipboard'
import { Button, buttonVariants } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { buildVideoPrompt, CAMERA_LOOKS, LIGHTING_LOOKS, VIDEO_EXAMPLES, videoErrorMessage, type StudioModel } from '@/lib/video-studio'

const selectClass = 'h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'
interface Result { url: string; provider: string; model: string; size: number }

export default function VideoStudioPage() {
  const modelsQuery = useQuery<{ models: StudioModel[] }>({
    queryKey: ['video-studio-models'], queryFn: () => apiFetch('/api/video-studio/models'),
    retry: false, refetchOnWindowFocus: true,
  })
  const models = modelsQuery.data?.models ?? []
  const usable = models.filter(model => model.enabled && model.hasKey)
  const [selectedId, setSelectedId] = useState('')
  const selected = usable.find(model => String(model.id) === selectedId) ?? usable[0]
  const [scene, setScene] = useState('')
  const [camera, setCamera] = useState<keyof typeof CAMERA_LOOKS>('push')
  const [lighting, setLighting] = useState<keyof typeof LIGHTING_LOOKS>('daylight')
  const [duration, setDuration] = useState('')
  const [aspectRatio, setAspectRatio] = useState('')
  const [pending, setPending] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const request = useRef<AbortController | null>(null)
  const objectUrl = useRef<string | null>(null)
  const mounted = useRef(true)
  const prompt = scene.trim() ? buildVideoPrompt(scene, camera, lighting) : ''
  const novai = selected?.platform === 'novai'

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; request.current?.abort(); if (objectUrl.current) URL.revokeObjectURL(objectUrl.current) }
  }, [])
  useEffect(() => {
    if (!pending) return
    const started = Date.now()
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000)
    return () => clearInterval(timer)
  }, [pending])

  async function generate(event: FormEvent) {
    event.preventDefault()
    if (request.current) return
    if (!scene.trim()) { setError('Describe one visible scene first.'); return }
    if (!selected) { setError('Connect a video provider and enable a model first.'); return }
    const controller = new AbortController()
    request.current = controller
    let timedOut = false
    const timer = setTimeout(() => { timedOut = true; controller.abort() }, 310_000)
    setPending(true); setElapsed(0); setError('')
    // Clear any previous result so it cannot be mistaken for this request.
    if (objectUrl.current) { URL.revokeObjectURL(objectUrl.current); objectUrl.current = null }
    setResult(null)
    try {
      const token = getToken()
      const response = await fetch(`${API_BASE}/api/video-studio/generations`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ modelId: selected.id, prompt,
          ...(duration ? { duration: Number(duration) } : {}),
          ...(aspectRatio ? { aspectRatio } : {}),
        }), signal: controller.signal,
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        if (response.status === 401 && body?.error?.type === 'authentication_error') {
          clearToken(); window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT))
        }
        throw new Error(body?.error?.message || videoErrorMessage(response.status))
      }
      if (!response.headers.get('content-type')?.toLowerCase().startsWith('video/mp4')) {
        throw new Error('The server did not return an MP4 video. Check the provider before retrying.')
      }
      const blob = await response.blob()
      if (blob.size < 24 || blob.size > 100 * 1024 * 1024) throw new Error('The returned video was empty or too large.')
      const signature = new Uint8Array(await blob.slice(4, 8).arrayBuffer())
      if (String.fromCharCode(...signature) !== 'ftyp') throw new Error('The provider response was not a valid MP4 video.')
      if (!mounted.current || controller.signal.aborted) return
      const url = URL.createObjectURL(blob)
      objectUrl.current = url
      const header = (name: string, fallback: string) => {
        try { return decodeURIComponent(response.headers.get(name) || fallback) } catch { return fallback }
      }
      setResult({ url, provider: header('X-Provider', selected.platform), model: header('X-Model', selected.modelId), size: blob.size })
    } catch (failure) {
      if (mounted.current) setError(controller.signal.aborted
        ? timedOut ? videoErrorMessage(504) : 'Stopped waiting. The provider may still finish the job or use quota. Check its history before retrying.'
        : failure instanceof Error ? failure.message : videoErrorMessage(502))
    } finally {
      clearTimeout(timer); request.current = null
      if (mounted.current) setPending(false)
    }
  }

  return <div className="mx-auto max-w-6xl space-y-6 pb-8">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground"><Clapperboard className="size-4" />FreeLLMAPI · Video studio</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Make your scene move.</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Describe one scene and create a short, realistic AI video. Preview the finished clip and download its MP4.</p></div>
      <Link to="/models/video" className={buttonVariants({ variant: 'outline' })}>Video models<ArrowRight className="size-4" /></Link>
    </header>

    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <form onSubmit={generate} className="min-w-0 rounded-3xl border bg-card p-5 sm:p-7">
        <fieldset disabled={pending} className="min-w-0 space-y-6">
          <div><label htmlFor="video-scene" className="mb-2 block text-sm font-semibold">01 · Describe your scene</label>
            <Textarea id="video-scene" value={scene} onChange={event => { setScene(event.target.value); setCopied(false); setError('') }} maxLength={5000} rows={6} className="min-h-40 resize-y leading-6" placeholder="For example: A mechanic slowly checks the oil in a stationary silver car inside a bright workshop…" />
            <div className="mt-3 flex flex-wrap items-center gap-2"><span className="text-xs text-muted-foreground">Start with an idea:</span>
              {VIDEO_EXAMPLES.map(example => <Button key={example.name} type="button" variant="outline" size="xs" onClick={() => { setScene(example.scene); setCopied(false); setError('') }}>{example.name}</Button>)}
            </div><p className="mt-3 text-xs leading-5 text-muted-foreground">Use one subject and one clear action. You can write your scene in Hindi or English; language support depends on the model.</p></div>
          <div><h2 className="mb-3 text-sm font-semibold">02 · Choose the look</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-xs text-muted-foreground" htmlFor="video-camera"><span>Camera</span><select id="video-camera" className={selectClass} value={camera} onChange={event => { setCamera(event.target.value as keyof typeof CAMERA_LOOKS); setCopied(false) }}><option value="push">Slow push-in</option><option value="still">Steady tripod</option><option value="track">Gentle tracking</option></select></label>
              <label className="space-y-2 text-xs text-muted-foreground" htmlFor="video-light"><span>Lighting</span><select id="video-light" className={selectClass} value={lighting} onChange={event => { setLighting(event.target.value as keyof typeof LIGHTING_LOOKS); setCopied(false) }}><option value="daylight">Natural daylight</option><option value="golden">Golden hour</option><option value="studio">Soft studio light</option></select></label>
            </div></div>
          <div><h2 className="mb-3 text-sm font-semibold">03 · Choose a video model</h2>
            {modelsQuery.isPending ? <p role="status" className="text-sm text-muted-foreground">Loading video models…</p>
              : modelsQuery.isError ? <div role="alert" className="rounded-xl border p-4 text-sm"><p>Could not load your video models. Check your connection and sign-in.</p><Button type="button" variant="outline" className="mt-3" onClick={() => modelsQuery.refetch()}><RefreshCw />Try again</Button></div>
                : usable.length === 0 ? <div className="rounded-2xl border border-dashed bg-muted/30 p-4"><KeyRound className="mb-2 size-5 text-muted-foreground" /><p className="text-sm font-medium">Connect a video provider</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{models.length ? 'Add a provider key and enable a video model to generate your first clip.' : 'The video catalog is empty. Let the catalog sync, then add a provider key.'} You can prepare and copy your prompt now.</p><div className="mt-3 flex flex-wrap gap-2"><Link to="/keys" className={buttonVariants({ size: 'sm' })}>Open Keys<ArrowRight /></Link><Button type="button" variant="outline" size="sm" onClick={() => modelsQuery.refetch()}><RefreshCw />Refresh models</Button></div></div>
                  : <><label className="sr-only" htmlFor="video-model">Video model</label><select id="video-model" value={selected ? String(selected.id) : ''} className={selectClass} onChange={event => { setSelectedId(event.target.value); setDuration(''); setAspectRatio('') }}>{usable.map(model => <option key={model.id} value={String(model.id)}>{model.name} · {model.platform}</option>)}</select><p className="mt-2 break-words text-xs text-muted-foreground">{selected?.quota || 'Check the provider for current video pricing and quota.'}</p></>}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-xs text-muted-foreground" htmlFor="video-duration"><span>Length</span><select id="video-duration" className={selectClass} value={duration} onChange={event => setDuration(event.target.value)}><option value="">Model default</option>{(novai ? [5] : [4, 5, 6, 8, 10]).map(seconds => <option key={seconds} value={seconds}>{seconds} seconds</option>)}</select></label>
              <label className="space-y-2 text-xs text-muted-foreground" htmlFor="video-aspect"><span>Frame</span><select id="video-aspect" className={selectClass} value={aspectRatio} onChange={event => setAspectRatio(event.target.value)}><option value="">Model default</option><option value="16:9">Landscape · 16:9</option>{!novai && <option value="9:16">Vertical · 9:16</option>}</select></label>
            </div><p className="mt-2 text-xs leading-5 text-muted-foreground">Start with model defaults. Supported lengths and frames vary by provider.</p></div>
        </fieldset>
        {error && <p role="alert" className="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm leading-6 text-destructive">{error}</p>}
        <div className="mt-6 flex flex-wrap gap-2">
          <Button type="submit" size="lg" disabled={pending || !selected || !scene.trim()} aria-busy={pending} className="h-11 flex-1 px-5">{pending ? <><LoaderCircle className="animate-spin" />Generating…</> : <><Clapperboard />Generate video</>}</Button>
          {pending && <Button type="button" variant="outline" size="lg" className="h-11" onClick={() => request.current?.abort()}><Square />Stop waiting</Button>}
        </div><p className="mt-3 text-xs leading-5 text-muted-foreground">Generation can take up to five minutes and may use provider credits. Quality and availability depend on the selected model. No automatic retry is started by this page.</p>
      </form>

      <aside className="min-w-0 space-y-5">
        <section className="overflow-hidden rounded-3xl border bg-card" aria-label="Video preview">
          <div className="flex items-center justify-between border-b px-5 py-4"><h2 className="text-sm font-semibold">Your clip</h2><span className="rounded-full bg-muted px-2 py-1 text-[10px] font-medium">AI-generated video</span></div>
          {result ? <div className="p-4"><video key={result.url} src={result.url} controls playsInline preload="metadata" className="max-h-[480px] w-full rounded-xl bg-black" aria-label="Generated video" /><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="min-w-0 break-all text-xs text-muted-foreground">{result.provider} · {result.model}<br />{(result.size / 1024 / 1024).toFixed(1)} MB</p><a href={result.url} download="realistic-video.mp4" className={buttonVariants({ variant: 'outline' })}><Download />Download MP4</a></div></div>
            : <div className="flex min-h-72 flex-col items-center justify-center bg-gradient-to-br from-muted/20 via-muted/60 to-muted/10 p-8 text-center sm:min-h-96">
              {pending ? <><LoaderCircle className="mb-5 size-10 animate-spin text-muted-foreground" /><p role="status" className="text-sm font-medium">Creating your video…</p><p aria-hidden="true" className="mt-2 text-xs tabular-nums text-muted-foreground">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')} elapsed</p><p className="mt-3 max-w-xs text-xs leading-5 text-muted-foreground">Keep this page open. The clip appears only after the provider returns a completed video.</p></>
                : <><div className="mb-5 rounded-2xl border bg-background/70 p-5"><Camera className="size-8 text-muted-foreground" /></div><p className="text-sm font-medium">Your next scene starts here.</p><p className="mt-2 max-w-xs text-xs leading-5 text-muted-foreground">Choose an idea or write your own. A completed video will appear here after generation.</p></>}
            </div>}
        </section>
        <section className="rounded-3xl border bg-card p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold">Your production prompt</h2><Button type="button" variant="ghost" size="sm" disabled={!prompt} onClick={async () => { setCopied(await copyText(prompt)) }}>{copied ? <Check /> : <Copy />}{copied ? 'Copied' : 'Copy'}</Button></div><p className="mt-3 whitespace-pre-wrap break-words text-xs leading-6 text-muted-foreground">{prompt || 'Your scene, camera and lighting choices combine into one clear prompt here.'}</p></section>
      </aside>
    </div>
  </div>
}
