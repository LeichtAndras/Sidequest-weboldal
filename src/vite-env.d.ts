/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** A Supabase projekt cime, pl. https://abcd.supabase.co */
  readonly VITE_SUPABASE_URL?: string
  /** A nyilvanos anon kulcs. Csak az RPC hivasokhoz kell, adatot nem lat. */
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
