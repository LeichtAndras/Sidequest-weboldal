import type { CSSProperties } from 'react'
import partnersData from '../../data/partners.json'
import type { Partner } from '../../types'
import type { Ajanlat } from '../../fiok/kinalat'

const partnerek = new Map((partnersData as Partner[]).map((p) => [p.slug, p]))

type KartyaAdat = Pick<Ajanlat, 'partner_slug' | 'partner' | 'szoveg' | 'jelveny' | 'keret' | 'szabad'>

/** A szazalek egy ajanlatbol (elobb a jelvenybol, aztan a szovegbol), pl. 40. */
export function szazalek(a: Pick<Ajanlat, 'jelveny' | 'szoveg'> | null): number | null {
  for (const forras of [a?.jelveny, a?.szoveg]) {
    const talalat = forras?.match(/(\d+)\s?%/)
    if (talalat) return Number(talalat[1])
  }
  return null
}

/**
 * A matrica szinszabalya, egy helyen: a legnagyobb szazalek (a meg
 * valaszthatok kozul) pink, a tobbi vilagoskek.
 */
export function legnagyobbSzazalek(ajanlatok: Ajanlat[]): number | null {
  const szamok = ajanlatok
    .filter((a) => a.szabad > 0)
    .map(szazalek)
    .filter((x): x is number => x !== null)
  return szamok.length > 0 ? Math.max(...szamok) : null
}

type Props = {
  ajanlat: KartyaAdat
  /** A legnagyobb szazalek a listaban: ennel a matrica pink. */
  max: number | null
  onClick?: () => void
  kijelolt?: boolean
  elfogyott?: boolean
  /**
   * A keszlet csik helyett ez a pirula all, pl. "Elfogyott · dec. 1-től újra"
   * vagy a valasztott ajandeknal "november 26-ig váltsd be".
   */
  alsoSor?: string
  /** Nem gomb, csak kep (pl. a megerosito lap tetejen). */
  statikus?: boolean
  disabled?: boolean
}

/**
 * Az udvozlo ajandek kartyaja: sotetkek lap a hely fotojaval es sotetitessel,
 * a hely neve, keszlet csik a valodi darabszammal, jobbra a dontott
 * kedvezmeny matrica. Ugyanez a kartya a regisztracios popupban, az
 * /ajandek/ oldalon es a megerosito lapon, hogy regisztracio elott es utan
 * ugyanazt lassa a user.
 */
export default function AjandekKartya({ ajanlat, max, onClick, kijelolt, elfogyott, alsoSor, statikus, disabled }: Props) {
  const partner = partnerek.get(ajanlat.partner_slug)
  const kep = partner?.venue ? `/venues/${partner.venue.replace(/(\.\w+)$/, '-640$1')}` : null
  const arany = ajanlat.keret > 0 ? Math.max(0.06, Math.min(1, ajanlat.szabad / ajanlat.keret)) : 1
  const keves = ajanlat.szabad <= 3
  const sz = szazalek(ajanlat)
  const kiemelt = !elfogyott && sz !== null && sz === max

  const osztaly = [
    'ap-ajandek',
    kijelolt ? 'ap-ajandek-kijelolt' : '',
    elfogyott ? 'ap-ajandek-elfogyott' : '',
    statikus ? 'ap-ajandek-statikus' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const stilus: CSSProperties | undefined = kep ? { backgroundImage: `url(${kep})` } : undefined

  const tartalom = (
    <>
      <span className="ap-ajandek-nev">{ajanlat.partner}</span>
      {/* A matricaban csak a szam all; a teljes ajanlat a kepolvasonak */}
      <span className="sr-only">{ajanlat.szoveg}</span>
      {alsoSor || elfogyott ? (
        <span className="ap-also-sor">{alsoSor ?? 'Elfogyott'}</span>
      ) : (
        <span className={`ap-keszlet${keves ? ' ap-keszlet-keves' : ''}`}>
          <span className="ap-sav" aria-hidden="true">
            <span style={{ width: `${arany * 100}%` }} />
          </span>
          {keves ? `Már csak ${ajanlat.szabad} db!` : `Még ${ajanlat.szabad} db`}
        </span>
      )}
      <span className={`ap-matrica${kiemelt ? ' ap-matrica-kiemelt' : ''}`} aria-hidden="true">
        {sz !== null ? (
          <span className="ap-matrica-szam">−{sz}%</span>
        ) : (
          <span className="ap-matrica-szam ap-matrica-szo">{ajanlat.jelveny ?? 'Ajándék'}</span>
        )}
      </span>
      {kijelolt ? (
        <span className="ap-pipa" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="1em" height="1em">
            <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      ) : null}
    </>
  )

  if (statikus) {
    return (
      <div className={osztaly} style={stilus}>
        {tartalom}
      </div>
    )
  }
  return (
    <button type="button" className={osztaly} style={stilus} onClick={onClick} disabled={disabled || elfogyott} aria-pressed={kijelolt}>
      {tartalom}
    </button>
  )
}
