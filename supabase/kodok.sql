-- =====================================================================
-- SideQuest online kodok, 3. fazis. Futtasd a Supabase SQL Editorban,
-- egyben, a supabase/bevaltas.sql UTAN. Tobbszor is lefuttathato.
--
-- Szabalyok, mind itt kikenyszeritve:
--   - kodot csak belepett user kaphat, kitoltott profillal, online partnernel
--   - egy kodot ket user sosem kaphat meg: a kiosztas FOR UPDATE SKIP LOCKED
--   - udvozlo kod csak aktiv udvozlo ajandekkal jar (supabase/ajandek.sql),
--     es kiadasakor az ajandek bevaltott lesz
--   - ugyanattol a partnertol ugyanabban a honapban ugyanazt a kodot kapja
--     vissza, nem ujat; egy usernel ket egyszerre erkezo keres sem visz el
--     ket kodot (tranzakcios zar userenkent es partnerenkent)
--   - lejart kodot nem oszt ki
--   - a kodbankot kivulrol senki nem latja, a user csak a sajat kodjait
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Kodbank. Havonta CSV-bol toltod fel, lasd supabase/KODOK-FELTOLTESE.md
-- ---------------------------------------------------------------------
create table if not exists public.code_pool (
  id bigint generated always as identity primary key,
  partner_slug text not null references public.partners (slug),
  code text not null,
  tipus text not null default 'normal' check (tipus in ('welcome', 'normal')),
  -- Az utolso nap, amikor a kod meg hasznalhato. Ures: nincs lejarata.
  valid_until date,
  -- Ha a user torli a fiokjat, a kod nem kerul vissza a bankba: az
  -- assigned_at megmarad, csak a hozzarendeles nullazodik.
  assigned_to uuid references auth.users (id) on delete set null,
  assigned_at timestamptz,
  created_at timestamptz not null default now(),
  unique (partner_slug, code)
);

create index if not exists code_pool_szabad_idx
  on public.code_pool (partner_slug, tipus, valid_until)
  where assigned_at is null;

alter table public.code_pool enable row level security;
revoke all on public.code_pool from anon, authenticated;

-- A kodokat az ajanlatok fuggvenyei osztjak ki (supabase/alap.sql es a
-- kesobbi fazisok). A regi online_kod_kerese megszunt, az alap.sql dobja el.
