import { useSyncExternalStore } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { kliens, vanTaroltMunkamenet } from './kliens'
import { kinalatFrissitese } from './kinalat'

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
   * A sajat igenylesek (claims), legujabb elol. Null, amig nincs betoltve.
   * Ebbol tudja a kartya, hogy van-e aktiv beváltás, es ma bevaltotta-e mar.
   */
  igenylesek: Igenyles[] | null
  /** Nyitva van-e a belepo ablak. */
  ablak: boolean
}

/** Egy sor a claims tablabol, ahogy a user latja. */
export type Igenyles = {
  id: string
  offer_id: number
  partner_slug: string
  tipus: 'alap' | 'welcome' | 'drop'
  szoveg: string
  igenyelve: string
  bevaltva: string | null
  lejarat: string
  /** Online partnernel a kiosztott kod, kulonben null. */
  kod: string | null
  rovid_kod: string
}

/**
 * A welcome ajandek allapota, a sajat igenylesekbol szamolva:
 *   nincs:     meg nem valasztott
 *   aktiv:     valasztott, a lejaratig a pultnal bevalthato
 *   bevaltott: felhasznalta, tobbet nem valaszthat
 *   lejart:    nem valtotta be idoben, ujra valaszthat
 */
export type WelcomeAllapot = {
  statusz: 'nincs' | 'aktiv' | 'bevaltott' | 'lejart'
  igenyles: Igenyles | null
}

/** Null, amig az igenylesek nincsenek betoltve. */
export function welcomeAllapot(igenylesek: Igenyles[] | null): WelcomeAllapot | null {
  if (igenylesek === null) return null
  const sajat = igenylesek.filter((c) => c.tipus === 'welcome')
  const bevaltott = sajat.find((c) => c.bevaltva !== null)
  if (bevaltott) return { statusz: 'bevaltott', igenyles: bevaltott }
  const utolso = sajat[0] ?? null
  if (!utolso) return { statusz: 'nincs', igenyles: null }
  return { statusz: Date.parse(utolso.lejarat) > Date.now() ? 'aktiv' : 'lejart', igenyles: utolso }
}

/** Valaszthat-e most welcome ajandekot. */
export const valaszthat = (w: WelcomeAllapot | null) => w !== null && (w.statusz === 'nincs' || w.statusz === 'lejart')

/** Az aktiv, meg be nem valtott welcome ajandek ennel a partnernel, ha van. */
export function aktivWelcome(igenylesek: Igenyles[] | null, slug: string): Igenyles | null {
  const w = welcomeAllapot(igenylesek)
  return w?.statusz === 'aktiv' && w.igenyles?.partner_slug === slug ? w.igenyles : null
}

const KINT = { email: null, keresztnev: null, igenylesek: null }

const SZERVER: Fiok = { allapot: 'ismeretlen', ...KINT, ablak: false }

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
        beallit({ allapot: 'kint', ...KINT })
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
      beallit({ allapot: 'kint', ...KINT })
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
    beallit({ allapot: 'kint', ...KINT })
    return
  }
  const { data } = await sb.from('profiles').select('first_name').maybeSingle()
  beallit({
    allapot: 'bent',
    email: felhasznalo.user.email ?? null,
    keresztnev: (data?.first_name as string | undefined) ?? null,
  })
  await igenylesekBetoltese()
}

/** A sajat igenylesek. Az RLS miatt mas userei nem jonnek le. */
export async function igenylesekBetoltese() {
  const sb = await sbKliens()
  const { data, error } = await sb
    .from('claims')
    .select('id, offer_id, partner_slug, tipus, szoveg, igenyelve, bevaltva, lejarat, kod, rovid_kod')
    .order('igenyelve', { ascending: false })
  beallit({ igenylesek: error ? [] : ((data ?? []) as Igenyles[]) })
}

/** A szerver valasza egy helyszini beváltásra, ezt mutatja a teljes kepernyo. */
export type AktivBevaltas = {
  id: string
  partner: string
  tipus: 'alap' | 'welcome' | 'drop'
  szoveg: string
  jelveny: string | null
  keresztnev: string
  rovidKod: string
  lejarat: number
  /** A szerver es a telefon orajanak kulonbsege, ezredmasodpercben. */
  eltolas: number
}

const BEVALTAS_UZENET: Record<string, string> = {
  nincs_belepve: 'Lejárt a belépésed. Lépj be újra.',
  nincs_profil: 'Előbb add meg a keresztneved a Fiókom oldalon.',
  nincs_ajanlat: 'Ennél a helynél most nincs beváltható kedvezmény.',
  nem_elerheto: 'Ennél a helynél még nem működik a beváltás.',
  ma_nem_ervenyes: 'Ez a kedvezmény ma nem érvényes. Nézd meg a feltételeket.',
  napi_limit: 'Ma már beváltottad ennél a helynél. Holnap újra beválthatod.',
  elfogyott: 'Erre a hónapra elfogyott a keret.',
}

/**
 * Alap kedvezmeny: az igenyles es a beváltás egy lepes. Helyszini
 * partnernel a teljes kepernyo adatai jonnek vissza, online partnernel a
 * kod. A szabalyokat (napi limit, keret, napok) a szerver ellenorzi, itt
 * csak forditunk. Utana a sajat listat es a kinalatot is frissitjuk.
 */
export async function alapBevaltasa(ajanlat: number): Promise<{ kepernyo: AktivBevaltas | null; kod: string | null }> {
  const sb = await sbKliens()
  const kuldve = Date.now()
  const { data, error } = await sb.rpc('alap_bevaltas', { p_ajanlat: ajanlat })
  if (error) throw forditas(error)
  const v = data as Record<string, unknown> | null
  const statusz = String(v?.statusz ?? '')
  void kinalatFrissitese()
  void igenylesekBetoltese()
  if (statusz !== 'ok' || !v) {
    throw new FiokHiba(BEVALTAS_UZENET[statusz] ?? 'Nem sikerült a beváltás. Próbáld újra.')
  }
  if (v.mod === 'online_kod') return { kepernyo: null, kod: String(v.kod) }
  return { kod: null, kepernyo: kepernyoAdat(v, kuldve) }
}

/** A szerver valaszabol a teljes kepernyo adatai. */
function kepernyoAdat(v: Record<string, unknown>, kuldve: number): AktivBevaltas {
  // A halozati ido felet hozzaadjuk, igy az ora masodpercre pontos marad
  const megjott = Date.now()
  const eltolas = Date.parse(String(v.most)) - (kuldve + megjott) / 2
  return {
    id: String(v.id),
    partner: String(v.partner),
    tipus: v.tipus === 'welcome' ? 'welcome' : v.tipus === 'drop' ? 'drop' : 'alap',
    szoveg: String(v.szoveg),
    jelveny: v.jelveny ? String(v.jelveny) : null,
    keresztnev: String(v.keresztnev),
    rovidKod: String(v.rovid_kod),
    lejarat: Date.parse(String(v.lejarat)),
    eltolas,
  }
}

const WELCOME_UZENET: Record<string, string> = {
  nincs_belepve: 'Lejárt a belépésed. Lépj be újra.',
  nincs_profil: 'Előbb add meg a keresztneved a Fiókom oldalon.',
  mar_bevaltotta: 'Az üdvözlő ajándékodat már beváltottad.',
  mar_valasztott: 'Már választottál ajándékot. Előbb azt váltsd be.',
  nincs_ajanlat: 'Ez az ajánlat már nem elérhető.',
  nem_elerheto: 'Ennél a helynél még nem működik az ajándék.',
  elfogyott: 'Ez az ajánlat közben elfogyott. Válassz egy másikat.',
  nincs_ajandek: 'Nincs aktív üdvözlő ajándékod.',
  online_partner: 'Ennél a helynél a kódodat foglaláskor kell beírni.',
  mar_felhasznalt: 'Az üdvözlő ajándékodat már beváltottad.',
  lejart: 'Az üdvözlő ajándékod lejárt. Válassz újat.',
  ma_nem_ervenyes: 'Ez az ajándék ma nem érvényes. Nézd meg a feltételeket.',
}

/** Welcome ajandek valasztasa. Hogy jar-e meg darab, azt a szerver donti el. */
export async function welcomeValasztasa(ajanlat: number) {
  const sb = await sbKliens()
  const { data, error } = await sb.rpc('welcome_valasztas', { p_ajanlat: ajanlat })
  if (error) throw forditas(error)
  const statusz = String((data as { statusz?: string } | null)?.statusz ?? '')
  void kinalatFrissitese()
  await igenylesekBetoltese()
  if (statusz !== 'ok') throw new FiokHiba(WELCOME_UZENET[statusz] ?? 'Nem sikerült a választás. Próbáld újra.')
}

/**
 * Welcome vagy drop bevaltasa a pultnal, ugyanazzal a teljes kepernyovel.
 * Online partnernel nincs ilyen: ott a kod kiadasa a beváltás.
 */
export async function igenylesBevaltasa(igenyles: string): Promise<AktivBevaltas> {
  const sb = await sbKliens()
  const kuldve = Date.now()
  const { data, error } = await sb.rpc('igenyles_bevaltas', { p_igenyles: igenyles })
  if (error) throw forditas(error)
  const v = data as Record<string, unknown> | null
  const statusz = String(v?.statusz ?? '')
  void igenylesekBetoltese()
  if (statusz !== 'ok' || !v) throw new FiokHiba(BEVALTAS2_UZENET[statusz] ?? 'Nem sikerült a beváltás. Próbáld újra.')
  return kepernyoAdat(v, kuldve)
}

const BEVALTAS2_UZENET: Record<string, string> = {
  ...WELCOME_UZENET,
  nincs_igenyles: 'Ezt a kódot nem találjuk a fiókodban.',
  mar_felhasznalt: 'Ezt a kódot már beváltottad.',
  lejart: 'Ez a kód lejárt.',
}

const DROP_UZENET: Record<string, string> = {
  nincs_belepve: 'Lejárt a belépésed. Lépj be újra.',
  nincs_profil: 'Előbb add meg a keresztneved a Fiókom oldalon.',
  nincs_ajanlat: 'Ez a drop már nem elérhető.',
  nem_elerheto: 'Ennél a helynél még nem működik a drop.',
  meg_nem_indult: 'A drop még nem indult el.',
  lezarult: 'A drop lezárult.',
  mar_igenyelted: 'Ebből a dropból már igényeltél.',
  elfogyott: 'Elfogyott. Legközelebb gyorsabbnak kell lenned!',
}

/** Drop igenylese. Hogy jar-e meg darab, azt a szerver donti el. */
export async function dropIgenyles(ajanlat: number) {
  const sb = await sbKliens()
  const { data, error } = await sb.rpc('drop_igenyles', { p_ajanlat: ajanlat })
  if (error) throw forditas(error)
  const statusz = String((data as { statusz?: string } | null)?.statusz ?? '')
  void kinalatFrissitese()
  await igenylesekBetoltese()
  if (statusz !== 'ok') throw new FiokHiba(DROP_UZENET[statusz] ?? 'Nem sikerült az igénylés. Próbáld újra.')
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
  beallit({ allapot: 'kint', ...KINT })
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
  beallit({ allapot: 'kint', ...KINT })
}
