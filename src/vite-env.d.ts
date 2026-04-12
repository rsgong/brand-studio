/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_N8N_WEBHOOK_URL: string
  readonly VITE_N8N_PASSPHRASE: string
  readonly VITE_N8N_IMAGE_WEBHOOK_PATH: string
  readonly VITE_N8N_VIDEO_WEBHOOK_PATH: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
