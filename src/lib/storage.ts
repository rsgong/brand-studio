import { supabase } from './supabase'

const BUCKET = 'reference-images'

/**
 * Upload a file to Supabase Storage.
 * Returns the public URL on success.
 */
export async function uploadReferenceImage(
  file: File,
  shotTypeId: string,
  index: number
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const filename = `${shotTypeId}/${index}-${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename)
  return data.publicUrl
}

/**
 * Delete a reference image from storage.
 * Extracts the path from a full public URL.
 */
export async function deleteReferenceImage(publicUrl: string): Promise<void> {
  // Extract path from URL: .../reference-images/shotTypeId/filename.jpg
  const match = publicUrl.match(/\/reference-images\/(.+)$/)
  if (!match) return

  const path = match[1]
  const { error } = await supabase.storage.from(BUCKET).remove([path])

  if (error) {
    console.warn('Failed to delete image:', error.message)
  }
}
