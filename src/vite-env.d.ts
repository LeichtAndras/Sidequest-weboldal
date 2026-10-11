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

/**
 * A build napja budapesti ido szerint, "ÉÉÉÉ-HH-NN". A vite.config.ts teszi
 * be. A szerveren es a bongeszo elso renderjeben is ez az ertek fut, igy a
 * hidratalas illeszkedik, utana valtunk a valodi mai napra.
 */
declare const __BUILD_NAP__: string
