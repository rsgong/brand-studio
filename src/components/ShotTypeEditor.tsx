import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { uploadReferenceImage, deleteReferenceImage } from '@/lib/storage'
import { useAuth } from '@/hooks/useAuth'
import type { ShotTypeRow } from '@/types'
import { ASPECT_RATIOS } from '@/types'
import { Save, X, Upload, Loader2, Trash2 } from 'lucide-react'

interface Props {
  shotType?: ShotTypeRow
  onSave: () => void
  onCancel: () => void
}

const DRAFT_KEY = 'fc-shot-type-draft'

interface Draft {
  name: string
  description: string
  mediaType: 'image' | 'video'
  systemPrompt: string
  defaultAspect: string
  defaultVariants: number
  referenceImages: (string | null)[]
  tempId: string
}

function loadDraft(): Draft | null {
  try {
    const saved = localStorage.getItem(DRAFT_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

function saveDraft(draft: Draft) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY)
}

export function ShotTypeEditor({ shotType, onSave, onCancel }: Props) {
  const { user } = useAuth()
  const isNew = !shotType

  // Load draft for new shot types
  const existingDraft = isNew ? loadDraft() : null

  const [name, setName] = useState(existingDraft?.name ?? shotType?.name ?? '')
  const [description, setDescription] = useState(existingDraft?.description ?? shotType?.description ?? '')
  const [mediaType, setMediaType] = useState<'image' | 'video'>(existingDraft?.mediaType ?? shotType?.media_type ?? 'image')
  const [systemPrompt, setSystemPrompt] = useState(existingDraft?.systemPrompt ?? shotType?.system_prompt ?? '')
  const [defaultAspect, setDefaultAspect] = useState(existingDraft?.defaultAspect ?? shotType?.default_aspect_ratio ?? '16:9')
  const [defaultVariants, setDefaultVariants] = useState(existingDraft?.defaultVariants ?? shotType?.default_variants ?? 3)
  const [saving, setSaving] = useState(false)

  // Reference images state: array of 4 slots (URL string or null)
  const [referenceImages, setReferenceImages] = useState<(string | null)[]>(() => {
    if (existingDraft?.referenceImages) return existingDraft.referenceImages
    const urls = shotType?.reference_image_urls ?? []
    return [urls[0] ?? null, urls[1] ?? null, urls[2] ?? null, urls[3] ?? null]
  })
  const [uploading, setUploading] = useState<boolean[]>([false, false, false, false])
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Hidden file inputs
  const fileInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  // For new shot types, we need a temporary ID for storage paths
  const [tempId] = useState(() => existingDraft?.tempId ?? shotType?.id ?? crypto.randomUUID())

  // Auto-save draft for new shot types
  useEffect(() => {
    if (!isNew) return
    const draft: Draft = {
      name,
      description,
      mediaType,
      systemPrompt,
      defaultAspect,
      defaultVariants,
      referenceImages,
      tempId,
    }
    saveDraft(draft)
  }, [isNew, name, description, mediaType, systemPrompt, defaultAspect, defaultVariants, referenceImages, tempId])

  // Track which image slot is active for paste
  const [activeSlot, setActiveSlot] = useState<number | null>(null)

  // Handle paste from clipboard
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    // Find an image in the clipboard
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (!file) continue

        // Determine which slot to use: active slot, or first empty slot
        let targetSlot = activeSlot
        if (targetSlot === null || referenceImages[targetSlot] !== null) {
          // Find first empty slot
          const emptyIndex = referenceImages.findIndex(img => img === null)
          if (emptyIndex !== -1) {
            targetSlot = emptyIndex
          }
        }

        if (targetSlot !== null && !uploading[targetSlot]) {
          handleFileSelect(targetSlot, file)
        }
        break
      }
    }
  }, [activeSlot, referenceImages, uploading])

  // Listen for paste events when component is mounted
  useEffect(() => {
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [handlePaste])

  async function handleFileSelect(index: number, file: File) {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image must be under 10MB')
      return
    }

    setUploadError(null)
    setUploading(prev => {
      const next = [...prev]
      next[index] = true
      return next
    })

    try {
      const url = await uploadReferenceImage(file, tempId, index)
      setReferenceImages(prev => {
        const next = [...prev]
        next[index] = url
        return next
      })
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(prev => {
        const next = [...prev]
        next[index] = false
        return next
      })
    }
  }

  async function handleRemoveImage(index: number) {
    const url = referenceImages[index]
    if (url) {
      await deleteReferenceImage(url)
    }
    setReferenceImages(prev => {
      const next = [...prev]
      next[index] = null
      return next
    })
  }

  async function handleSave() {
    if (!user || !name.trim()) return
    setSaving(true)

    // Filter out null values for the final URL array
    const finalUrls = referenceImages.filter((url): url is string => url !== null)

    const payload = {
      name: name.trim(),
      description: description.trim(),
      media_type: mediaType,
      system_prompt: systemPrompt,
      default_aspect_ratio: defaultAspect,
      default_variants: defaultVariants,
      reference_image_urls: finalUrls,
      parameter_visibility: shotType?.parameter_visibility ?? {},
      created_by: user.id,
    }

    if (isNew) {
      // Include id so storage paths match the shot type
      await supabase.from('shot_types').insert({ ...payload, id: tempId })
    } else {
      await supabase.from('shot_types').update({
        ...payload,
        version: (shotType.version ?? 0) + 1,
      }).eq('id', shotType.id)
    }

    setSaving(false)
    if (isNew) clearDraft()
    onSave()
  }

  function handleCancel() {
    if (isNew) clearDraft()
    onCancel()
  }

  const isUploading = uploading.some(Boolean)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Media Type</label>
        <div className="flex gap-2">
          {(['image', 'video'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setMediaType(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mediaType === t
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={6}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="The system prompt sent to the generation model along with reference images..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Default Aspect Ratio</label>
          <select
            value={defaultAspect}
            onChange={(e) => setDefaultAspect(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {ASPECT_RATIOS.map((ar) => (
              <option key={ar.value} value={ar.value}>{ar.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Default Variants: {defaultVariants}
          </label>
          <input
            type="range"
            min={1}
            max={4}
            value={defaultVariants}
            onChange={(e) => setDefaultVariants(Number(e.target.value))}
            className="w-full mt-2"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Reference Images (up to 4)
        </label>
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="relative group">
              <input
                ref={fileInputRefs[i]}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileSelect(i, file)
                  e.target.value = ''
                }}
              />
              <div
                onClick={() => {
                  setActiveSlot(i)
                  if (!uploading[i] && !referenceImages[i]) {
                    fileInputRefs[i].current?.click()
                  }
                }}
                className={`aspect-square border-2 rounded-lg flex items-center justify-center transition-colors ${
                  referenceImages[i]
                    ? activeSlot === i ? 'border-brand-500' : 'border-transparent'
                    : activeSlot === i
                      ? 'border-brand-500 bg-brand-50 cursor-pointer'
                      : 'border-dashed border-gray-300 hover:border-gray-400 cursor-pointer'
                }`}
              >
                {uploading[i] ? (
                  <Loader2 size={24} className="text-gray-400 animate-spin" />
                ) : referenceImages[i] ? (
                  <img
                    src={referenceImages[i]!}
                    alt={`Reference ${i + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="text-center">
                    <Upload size={20} className="mx-auto text-gray-300" />
                    <span className="text-xs text-gray-400 mt-1 block">
                      {activeSlot === i ? 'Paste or click' : `Image ${i + 1}`}
                    </span>
                  </div>
                )}
              </div>
              {referenceImages[i] && !uploading[i] && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                  <button
                    onClick={() => fileInputRefs[i].current?.click()}
                    className="p-2 bg-white rounded-full hover:bg-gray-100"
                    title="Replace image"
                  >
                    <Upload size={14} className="text-gray-700" />
                  </button>
                  <button
                    onClick={() => handleRemoveImage(i)}
                    className="p-2 bg-white rounded-full hover:bg-gray-100"
                    title="Remove image"
                  >
                    <Trash2 size={14} className="text-red-600" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        {uploadError && (
          <p className="text-xs text-red-500 mt-2">{uploadError}</p>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          onClick={handleCancel}
          className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X size={14} /> Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || isUploading || !name.trim()}
          className="flex items-center gap-1.5 bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          <Save size={14} /> {saving ? 'Saving...' : isNew ? 'Create' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
