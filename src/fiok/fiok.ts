import { useSyncExternalStore } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { kliens, vanTaroltMunkamenet } from './kliens'

/**
 * A fiok allapota, egy helyen. A hero pirula, a belepo ablak, a Fiokom
 * oldal es kesobb a kartyak gombjai is ezt olvassak.
 *
 * "ismeretlen": a szerveren es a hidratalasnal, amikor meg nem tudjuk.
 * "kint": nincs belepve senki.
 * "bent": van munkamenet. Ha a keresznev null, a profil meg nincs kitoltve,
 *         ilyenkor a belepo ablak a profil lepessel folytatja.
 */
export type Fiok = {
  allapot: 'ismeretlen' | 'kint' | 'bent'
  email: string | null
  keresztnev: string | null
  /**
   * A sajat beváltások, legujabb elol. Null, amig nincs betoltve. Ebbol
   * tudja a kartya, hogy az udvozlo kedvezmeny fel van-e mar hasznalva.
   */
  bevaltasok: Bevaltas[] | null
  /** Nyitva van-e a belepo ablak. */
  ablak: boolean
}

/** Egy sor a redemptions tablabol, ahogy a user latja. */
export type Bevaltas = {
  partner_slug: string
  tipus: 'welcome' | 'normal'
  pct: number
  created_at: string
  expires_at: string
  /** Online partnernel a kiosztott kod, kulonben null. */
  code: string | null
}

const SZERVER: Fiok = { allapot: 'ismeretlen', email: null, keresztnev: null, bevaltasok: null, ablak: false }

let allapot: Fiok = SZERVER
const figyelok = new Set<() => void>()

function beallit(uj: Partial<Fiok>) {
  allapot = { ...allapot, ...uj }
  figyelok.forEach((f) => f())
}

let figyeloKesz = false

/**
 * A kliens, bekotott figyelovel. Barmelyik uton toltjuk be (tarolt
 * munkamenet vagy uj belepes), a kijelentkezest es a lejart munkamenetet
 * mindig eszrevesszuk, peldaul ha egy masik fulon lep ki.
 */
async function sbKliens(): Promise<SupabaseClient> {
  const sb = await kliens()
  if (!figyeloKesz) {
    figyeloKesz = true
    sb.auth.onAuthStateChange((esemeny, munkamenet) => {
      if (esemeny === 'SIGNED_OUT' || !munkamenet) {
        beallit({ allapot: 'kint', email: null, keresztnev: null, bevaltasok: null })
      }
    })
  }
  return sb
}

let elindult = false

/**
 * Egyszer fut, a bongeszoben. Ha nincs tarolt munkamenet, a konyvtarat
 * sem toltjuk be. Ha van, rogton "bent"-nek mutatjuk, hogy a pirulan ne
 * villanjon fel a "Belépés", es a hatterben ellenorizzuk.
 */
function indulas() {
  if (elindult || typeof window === 'undefined') return
  elindult = true

  if (!vanTaroltMunkamenet()) {
    beallit({ allapot: 'kint' })
    return
  }

  beallit({ allapot: 'bent' })
  void sbKliens().then(async (sb) => {
    const { data } = await sb.auth.getSession()
    if (!data.session) {
      beallit({ allapot: 'kint', email: null, keresztnev: null, bevaltasok: null })
      return
    }
    await profilBetoltese()
  })
}

function feliratkozas(f: () => void) {
  figyelok.add(f)
  indulas()
  return () => figyelok.delete(f)
}

export function useFiok(): Fiok {
  return useSyncExternalStore(
    feliratkozas,
    () => allapot,
    () => SZERVER,
  )
}

export const belepesNyitasa = () => beallit({ ablak: true })
export const belepesBezarasa = () => beallit({ ablak: false })

/** Felhasznalonak mutathato hiba, mindig magyarul. */
export class FiokHiba extends Error {}

function forditas(hiba: unknown): FiokHiba {
  const h = hiba as { code?: string; status?: number; message?: string; name?: string }
  if (h?.code === 'over_email_send_rate_limit' || h?.code === 'over_request_rate_limit' || h?.status === 429) {
    return new FiokHiba('Most túl sok kódot kértél. Várj egy kicsit, és próbáld újra.')
  }
  if (h?.code === 'otp_expired' || /expired|invalid/i.test(h?.message ?? '')) {
    return new FiokHiba('Ez a kód hibás vagy lejárt. Nézd meg újra, vagy kérj új kódot.')
  }
  if (h?.code === 'email_address_invalid' || h?.code === 'validation_failed') {
    return new FiokHiba('Ez az e-mail-cím nem tűnik jónak. Nézd meg, nincs-e elírva.')
  }
  if (h?.name === 'AuthRetryableFetchError' || h?.name === 'TypeError') {
    return new FiokHiba('Nincs kapcsolat. Ellenőrizd a netet, és próbáld újra.')
  }
  return new FiokHiba('Valami félrement. Próbáld újra pár másodperc múlva.')
}

/** Betolti a sajat profilt. Ha meg nincs, a keresztnev null marad. */
export async function profilBetoltese() {
  const sb = await sbKliens()
  const { data: felhasznalo } = await sb.auth.getUser()
  if (!felhasznalo.user) {
    beallit({ allapot: 'kint', email: null, keresztnev: null, bevaltasok: null })
    return
  }
  const { data } = await sb.from('profiles').select('first_name').maybeSingle()
  beallit({
    allapot: 'bent',
    email: felhasznalo.user.email ?? null,
    keresztnev: (data?.first_name as string | undefined) ?? null,
  })
  await bevaltasokBetoltese()
}

/** A sajat beváltások. Az RLS miatt mas userei nem jonnek le. */
export async function bevaltasokBetoltese() {
  const sb = await sbKliens()
  const { data, error } = await sb
    .from('redemptions')
    .select('partner_slug, tipus, pct, created_at, expires_at, code')
    .order('created_at', { ascending: false })
  // Ha a tabla meg nincs letrehozva, ures listaval megyunk tovabb
  beallit({ bevaltasok: error ? [] : ((data ?? []) as Bevaltas[]) })
}

/** A szerver valasza egy beváltásra, ezt mutatja a teljes kepernyos ablak. */
export type AktivBevaltas = {
  id: string
  partner: string
  tipus: 'welcome' | 'normal'
  pct: number
  keresztnev: string
  rovidKod: string
  lejarat: number
  /** A szerver es a telefon orajanak kulonbsege, ezredmasodpercben. */
  eltolas: number
}

const BEVALTAS_UZENET: Record<string, string> = {
  nincs_belepve: 'Lejárt a belépésed. Lépj be újra.',
  nincs_profil: 'Előbb add meg a keresztneved a Fiókom oldalon.',
  nincs_partner: 'Ennél a helynél most nem lehet kedvezményt beváltani.',
  online_partner: 'Ennél a helynél online, foglaláskor kapod a kedvezményt.',
  mar_felhasznalt: 'Az üdvözlő kedvezményt ennél a helynél már felhasználtad.',
  ma_nem_ervenyes: 'Ez a kedvezmény ma nem érvényes. Nézd meg a feltételeket.',
  hibas_keres: 'Valami félrement. Próbáld újra.',
}

/**
 * Beváltás a kasszanal. A szabalyokat a szerver ellenorzi, itt csak
 * leforditjuk a valaszt. Siker utan a sajat listat is frissitjuk, hogy a
 * kartya rogton a normal kedvezmenyre valtson.
 */
export async function bevaltasInditasa(slug: string, tipus: 'welcome' | 'normal'): Promise<AktivBevaltas> {
  const sb = await sbKliens()
  const kuldve = Date.now()
  const { data, error } = await sb.rpc('bevaltas_inditasa', { p_partner: slug, p_tipus: tipus })
  if (error) throw forditas(error)
  const v = data as Record<string, unknown> | null
  const statusz = String(v?.statusz ?? '')
  if (statusz !== 'ok' || !v) {
    void bevaltasokBetoltese()
    throw new FiokHiba(BEVALTAS_UZENET[statusz] ?? 'Nem sikerült a beváltás. Próbáld újra.')
  }
  // A halozati ido felet hozzaadjuk, igy az ora masodpercre pontos marad
  const megjott = Date.now()
  const eltolas = Date.parse(String(v.most)) - (kuldve + megjott) / 2
  void bevaltasokBetoltese()
  return {
    id: String(v.id),
    partner: String(v.partner),
    tipus: v.tipus === 'welcome' ? 'welcome' : 'normal',
    pct: Number(v.pct),
    keresztnev: String(v.keresztnev),
    rovidKod: String(v.rovid_kod),
    lejarat: Date.parse(String(v.lejarat)),
    eltolas,
  }
}

/** 6 jegyu kodot kuld e-mailben. Uj cimnel a fiokot is letrehozza. */
export async function kodKuldese(email: string) {
  const sb = await sbKliens()
  const { error } = await sb.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: true },
  })
  if (error) throw forditas(error)
}

/** Ellenorzi a kodot. Siker utan igaz, ha a profil meg nincs kitoltve. */
export async function kodEllenorzese(email: string, kod: string): Promise<{ ujFiok: boolean }> {
  const sb = await sbKliens()
  const { error } = await sb.auth.verifyOtp({ email: email.trim(), token: kod.trim(), type: 'email' })
  if (error) throw forditas(error)
  await profilBetoltese()
  return { ujFiok: allapot.keresztnev === null }
}

const PROFIL_UZENET: Record<string, string> = {
  nincs_belepve: 'Lejárt a belépésed. Lépj be újra.',
  hianyzo_elfogadas: 'Mindkét négyzetet be kell pipálnod a folytatáshoz.',
  rossz_nev: 'Írd be a keresztneved (legfeljebb 40 karakter).',
}

/** Elmenti a keresztnevet es a ket elfogadast. A szabalyt a szerver ellenorzi. */
export async function profilMentese(keresztnev: string, elmult16: boolean, elfogadja: boolean) {
  const sb = await sbKliens()
  const { data, error } = await sb.rpc('profil_mentese', {
    p_keresztnev: keresztnev,
    p_elmult_16: elmult16,
    p_elfogadja: elfogadja,
  })
  if (error) throw forditas(error)
  const statusz = (data as { statusz?: string } | null)?.statusz
  if (statusz !== 'ok') throw new FiokHiba(PROFIL_UZENET[statusz ?? ''] ?? 'Nem sikerült menteni. Próbáld újra.')
  await profilBetoltese()
}

export async function kijelentkezes() {
  const sb = await sbKliens()
  await sb.auth.signOut()
  beallit({ allapot: 'kint', email: null, keresztnev: null, bevaltasok: null })
}

/** Torli a fiokot minden adattal, utana kilepteti a bongeszot is. */
export async function fiokTorlese() {
  const sb = await sbKliens()
  const { data, error } = await sb.rpc('fiok_torlese')
  if (error) throw forditas(error)
  if ((data as { statusz?: string } | null)?.statusz !== 'ok') {
    throw new FiokHiba('Nem sikerült törölni a fiókot. Lépj be újra, és próbáld meg még egyszer.')
  }
  // A szerveren mar nincs meg a fiok, ezert csak helyben toroljuk a munkamenetet
  await sb.auth.signOut({ scope: 'local' })
  beallit({ allapot: 'kint', email: null, keresztnev: null, bevaltasok: null })
}

const KOD_UZENET: Record<string, string> = {
  nincs_belepve: 'Lejárt a belépésed. Lépj be újra.',
  nincs_profil: 'Előbb add meg a keresztneved a Fiókom oldalon.',
  nincs_partner: 'Ennél a helynél most nem lehet kódot kérni.',
  helyszini_partner: 'Ennél a helynél a kasszánál kapod a kedvezményt.',
  elfogyott: 'Erre a hónapra elfogytak a kódok.',
}

/**
 * Online kod kerese. Hogy melyik kod jar (a honap mar meglevo kodja, az
 * udvozlo vagy egy uj havi), azt a szerver donti el, itt csak forditunk.
 */
export async function onlineKodKerese(slug: string) {
  const sb = await sbKliens()
  const { data, error } = await sb.rpc('online_kod_kerese', { p_partner: slug })
  if (error) throw forditas(error)
  const v = data as Record<string, unknown> | null
  const statusz = String(v?.statusz ?? '')
  if (statusz !== 'ok' || !v) throw new FiokHiba(KOD_UZENET[statusz] ?? 'Nem sikerült kódot kérni. Próbáld újra.')
  await bevaltasokBetoltese()
  return { ujra: Boolean(v.ujra), tipus: v.tipus === 'welcome' ? 'welcome' : 'normal', kod: String(v.kod) } as const
}
