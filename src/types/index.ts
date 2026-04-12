export type {
  Database,
  ShotTypeRow,
  ShotTypeInsert,
  ShotTypeUpdate,
  GenerationRow,
  GenerationInsert,
  GenerationUpdate,
  ProfileRow,
  ProfileInsert,
  ProfileUpdate,
} from './database'

/** Aspect ratio options available in the UI */
export const ASPECT_RATIOS = [
  { value: '16:9', label: '16:9 Landscape' },
  { value: '1:1', label: '1:1 Square' },
  { value: '9:16', label: '9:16 Portrait' },
] as const

export type AspectRatio = (typeof ASPECT_RATIOS)[number]['value']

/** Maps aspect ratio to OpenAI image size */
export const ASPECT_TO_SIZE: Record<AspectRatio, string> = {
  '16:9': '1536x1024',
  '1:1': '1024x1024',
  '9:16': '1024x1536',
}
