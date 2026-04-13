import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { generateImage, generateVideo } from '@/lib/generate'
import type { ShotTypeRow, GenerationRow } from '@/types'
import { ASPECT_RATIOS } from '@/types'
import { Loader2, Star, Clock, AlertCircle, Film } from 'lucide-react'

// Video-specific options
const VIDEO_DURATIONS = [
  { value: 5, label: '5 seconds' },
  { value: 6, label: '6 seconds' },
  { value: 7, label: '7 seconds' },
  { value: 8, label: '8 seconds (default)' },
] as const

const SAMPLE_COUNTS = [
  { value: 1, label: '1 video' },
  { value: 2, label: '2 videos (default)' },
  { value: 3, label: '3 videos' },
  { value: 4, label: '4 videos' },
] as const

export function GeneratePage() {
  const { shotTypeId } = useParams<{ shotTypeId: string }>()
  const { user } = useAuth()
  const [shotType, setShotType] = useState<ShotTypeRow | null>(null)
  const [history, setHistory] = useState<GenerationRow[]>([])
  const [prompt, setPrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [userImage, setUserImage] = useState<File | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)

  // Video-specific state
  const [duration, setDuration] = useState(8)
  const [sampleCount, setSampleCount] = useState(2)
  const [firstFrameFile, setFirstFrameFile] = useState<File | null>(null)
  const [lastFrameFile, setLastFrameFile] = useState<File | null>(null)
  const [firstFramePreview, setFirstFramePreview] = useState<string | null>(null)
  const [lastFramePreview, setLastFramePreview] = useState<string | null>(null)

  // Convert file to base64 for video frame uploads
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Remove data URL prefix to get just the base64
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }, [])

  // Handle first frame file selection
  const handleFirstFrameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setFirstFrameFile(file)
    if (file) {
      const url = URL.createObjectURL(file)
      setFirstFramePreview(url)
    } else {
      setFirstFramePreview(null)
    }
  }, [])

  // Handle last frame file selection
  const handleLastFrameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setLastFrameFile(file)
    if (file) {
      const url = URL.createObjectURL(file)
      setLastFramePreview(url)
    } else {
      setLastFramePreview(null)
    }
  }, [])

  // Cleanup preview URLs
  useEffect(() => {
    return () => {
      if (firstFramePreview) URL.revokeObjectURL(firstFramePreview)
      if (lastFramePreview) URL.revokeObjectURL(lastFramePreview)
    }
  }, [firstFramePreview, lastFramePreview])

  useEffect(() => {
    if (!shotTypeId) return
    // Load shot type
    supabase.from('shot_types').select('*').eq('id', shotTypeId).single()
      .then(({ data }) => {
        if (data) {
          setShotType(data)
          setAspectRatio(data.default_aspect_ratio)
        }
      })
    // Load generation history for this shot type
    supabase.from('generations').select('*')
      .eq('shot_type_id', shotTypeId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setHistory(data)
      })
  }, [shotTypeId])

  // Poll for pending/generating video status updates
  useEffect(() => {
    const pendingGenerations = history.filter(
      (g) => g.media_type === 'video' && (g.status === 'pending' || g.status === 'generating')
    )
    if (pendingGenerations.length === 0) return

    const pollInterval = setInterval(async () => {
      const ids = pendingGenerations.map((g) => g.id)
      const { data } = await supabase
        .from('generations')
        .select('*')
        .in('id', ids)

      if (data) {
        setHistory((prev) =>
          prev.map((g) => {
            const updated = data.find((d) => d.id === g.id)
            return updated || g
          })
        )
      }
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(pollInterval)
  }, [history])

  async function handleGenerate() {
    if (!shotType || !user || !prompt.trim()) return
    setGenerating(true)
    setGenerationError(null)

    try {
      if (shotType.media_type === 'video') {
        // Create generation record FIRST with pending status
        const generationId = crypto.randomUUID()
        const { data: genRecord, error: insertError } = await supabase.from('generations').insert({
          id: generationId,
          shot_type_id: shotType.id,
          user_id: user.id,
          prompt: prompt.trim(),
          media_type: 'video',
          aspect_ratio: aspectRatio,
          variants: sampleCount,
          status: 'pending',
          result_urls: [],
          starred: false,
          metadata: {
            duration_seconds: duration,
            sample_count: sampleCount,
            has_first_frame: !!firstFrameFile,
            has_last_frame: !!lastFrameFile,
          },
        }).select().single()

        if (insertError) {
          throw new Error(`Failed to create generation record: ${insertError.message}`)
        }

        // Add to history immediately to show pending state
        if (genRecord) setHistory((prev) => [genRecord, ...prev])

        // Convert frames to base64 if provided
        let firstFrameBase64: string | undefined
        let lastFrameBase64: string | undefined

        if (firstFrameFile) {
          firstFrameBase64 = await fileToBase64(firstFrameFile)
        }
        if (lastFrameFile) {
          lastFrameBase64 = await fileToBase64(lastFrameFile)
        }

        // Call n8n webhook with the generation ID
        await generateVideo({
          shotType,
          prompt: prompt.trim(),
          aspectRatio,
          userId: user.id,
          sampleCount,
          durationSeconds: duration,
          firstFrameBase64,
          lastFrameBase64,
          generationId,
        })

        // Update status to generating
        await supabase.from('generations').update({ status: 'generating' }).eq('id', generationId)
        setHistory((prev) =>
          prev.map((g) => (g.id === generationId ? { ...g, status: 'generating' } : g))
        )

        // Clear the frame inputs
        setFirstFrameFile(null)
        setLastFrameFile(null)
        setFirstFramePreview(null)
        setLastFramePreview(null)
      } else {
        const result = await generateImage({
          shotType,
          prompt: prompt.trim(),
          aspectRatio,
          variants: shotType.default_variants,
          userImageFile: userImage,
          userId: user.id,
        })

        // Insert generation record
        const { data } = await supabase.from('generations').insert({
          shot_type_id: shotType.id,
          user_id: user.id,
          prompt: prompt.trim(),
          media_type: 'image',
          aspect_ratio: aspectRatio,
          variants: shotType.default_variants,
          status: 'complete',
          result_urls: result.images.map((img: { base64: string }) =>
            `data:image/png;base64,${img.base64}`
          ),
          starred: false,
          metadata: {},
        }).select().single()

        if (data) setHistory((prev) => [data, ...prev])
      }
    } catch (err) {
      console.error('Generation failed:', err)
      setGenerationError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  if (!shotType) return <p className="text-gray-400">Loading...</p>

  return (
    <div className="flex gap-8">
      {/* Left: history */}
      <div className="flex-1 min-w-0">
        <h2 className="text-2xl font-semibold mb-1">{shotType.name}</h2>
        <p className="text-gray-500 text-sm mb-6">{shotType.description}</p>

        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">
          Generation History
        </h3>

        <div className="space-y-6">
          {history.map((gen) => (
            <div key={gen.id} className="border border-gray-200 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-sm text-gray-700 flex-1">{gen.prompt}</p>
                <button
                  onClick={async () => {
                    await supabase.from('generations').update({ starred: !gen.starred }).eq('id', gen.id)
                    setHistory((h) => h.map((g) => g.id === gen.id ? { ...g, starred: !g.starred } : g))
                  }}
                  className="ml-3 text-gray-300 hover:text-yellow-500 transition-colors"
                >
                  <Star size={16} fill={gen.starred ? 'currentColor' : 'none'} className={gen.starred ? 'text-yellow-500' : ''} />
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                <span>v{shotType.version}</span>
                <span>{gen.aspect_ratio}</span>
                <span>{new Date(gen.created_at).toLocaleDateString()}</span>
              </div>
              {/* Pending or generating status */}
              {(gen.status === 'pending' || gen.status === 'generating') && (
                <div className="flex items-center gap-3 py-4 px-3 bg-gray-50 rounded-lg">
                  {gen.status === 'pending' ? (
                    <Clock size={18} className="text-gray-400" />
                  ) : (
                    <Loader2 size={18} className="text-brand-500 animate-spin" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {gen.status === 'pending' ? 'Queued' : 'Generating...'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {gen.media_type === 'video' && 'Video generation can take a few minutes'}
                    </p>
                  </div>
                </div>
              )}

              {/* Completed results */}
              {gen.status === 'complete' && gen.result_urls.length > 0 && (
                gen.media_type === 'video' ? (
                  <div className="grid grid-cols-2 gap-3">
                    {gen.result_urls.map((url, i) => (
                      <div key={i} className="relative">
                        <video
                          src={url}
                          controls
                          className="rounded-lg w-full"
                          poster=""
                        >
                          <track kind="captions" />
                        </video>
                        <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
                          <Film size={12} />
                          <span>Video {i + 1}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {gen.result_urls.map((url, i) => (
                      <img key={i} src={url} alt={`Result ${i + 1}`} className="rounded-lg w-full aspect-square object-cover" />
                    ))}
                  </div>
                )
              )}

              {/* Failed status */}
              {gen.status === 'failed' && (
                <div className="flex items-start gap-2 py-3 px-3 bg-red-50 rounded-lg">
                  <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-600">{gen.error_message || 'Generation failed'}</p>
                </div>
              )}
            </div>
          ))}

          {history.length === 0 && (
            <p className="text-gray-400 text-sm py-8 text-center">
              No generations yet. Write a prompt to get started.
            </p>
          )}
        </div>
      </div>

      {/* Right: generate form */}
      <div className="w-80 shrink-0">
        <div className="sticky top-8 bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold mb-4">
            Generate {shotType.media_type === 'video' ? 'Video' : 'Image'}
          </h3>

          <label className="block text-sm font-medium text-gray-700 mb-1.5">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what you want to generate..."
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />

          <label className="block text-sm font-medium text-gray-700 mt-4 mb-1.5">Aspect Ratio</label>
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {ASPECT_RATIOS.map((ar) => (
              <option key={ar.value} value={ar.value}>{ar.label}</option>
            ))}
          </select>

          {shotType.media_type === 'image' && (
            <>
              <label className="block text-sm font-medium text-gray-700 mt-4 mb-1.5">
                Upload your image (optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setUserImage(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-gray-300 file:text-sm file:font-medium file:bg-white file:text-gray-700 hover:file:bg-gray-50"
              />
            </>
          )}

          {shotType.media_type === 'video' && (
            <>
              <label className="block text-sm font-medium text-gray-700 mt-4 mb-1.5">Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {VIDEO_DURATIONS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>

              <label className="block text-sm font-medium text-gray-700 mt-4 mb-1.5">Sample Count</label>
              <select
                value={sampleCount}
                onChange={(e) => setSampleCount(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {SAMPLE_COUNTS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>

              <label className="block text-sm font-medium text-gray-700 mt-4 mb-1.5">
                First Frame (optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFirstFrameChange}
                className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-gray-300 file:text-sm file:font-medium file:bg-white file:text-gray-700 hover:file:bg-gray-50"
              />
              {firstFramePreview && (
                <img src={firstFramePreview} alt="First frame" className="mt-2 w-full rounded-lg" />
              )}

              <label className="block text-sm font-medium text-gray-700 mt-4 mb-1.5">
                Last Frame (optional, for interpolation)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLastFrameChange}
                className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-gray-300 file:text-sm file:font-medium file:bg-white file:text-gray-700 hover:file:bg-gray-50"
              />
              {lastFramePreview && (
                <img src={lastFramePreview} alt="Last frame" className="mt-2 w-full rounded-lg" />
              )}
            </>
          )}

          {generationError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600">{generationError}</p>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="w-full mt-6 flex items-center justify-center gap-2 bg-gray-900 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating && <Loader2 size={16} className="animate-spin" />}
            {generating ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  )
}
