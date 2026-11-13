import { useEffect, useRef, useState } from 'react'
import { CheckIcon, CopyIcon } from '../Icons'
import { useFiok, type Igenyles } from '../../fiok/fiok'
import { hataridoNap } from '../../fiok/kinalat'
import { szazalek } from './AjandekKartya'
import { TIPUS, csoport, kepernyoEl, partnerek, usePartnerNev } from './BevaltasFolyamat'

const IDOPONT = new Intl.DateTimeFormat('hu-HU', {
  timeZone: 'Europe/Budapest',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const STATUSZ = { aktiv: 'Aktív', bevaltott: 'Beváltva', lejart: 'Lejárt' } as const

type Props = {
  /** A pultnal valo beváltás inditasa (useBevaltas). */
  onBevalt: (c: Igenyles) => void
  dolgozik: boolean
  hiba: string | null
  /** Az aktiv welcome ajandek id-je, ha fent, a kiemelt kartyan mar latszik. */
  rejtett?: string | null
}

/**
 * Kódjaim a Fiókom oldalon: minden igenyles (alap, welcome, drop) egy-egy
 * jegy kartyan. Elol az aktivak; a beváltott es a lejart jegyek egy
 * lenyithato "Korábbiak" alatt, halvanyan. Online kodnal a kod maga,
 * masolas gombbal; helyszininel "Beváltom", ugyanazzal a megerosito
 * ablakkal es teljes kepernyovel, mint a kartyan.
 */
export default function Kodjaim({ onBevalt, dolgozik, hiba, rejtett }: Props) {
  const fiok = useFiok()
  const nev = usePartnerNev()
  if (fiok.igenylesek === null) return null

  const lista = fiok.igenylesek.filter((c) => c.id !== rejtett)
  const aktivak = lista.filter((c) => csoport(c) === 'aktiv')
  const korabbiak = lista.filter((c) => csoport(c) !== 'aktiv')

  return (
    <section className="fk-kartya" aria-labelledby="kodjaim-cim">
      <h2 id="kodjaim-cim" className="fk-szakasz-cim">
        Kódjaim
        {aktivak.length > 0 ? <span className="fk-szam">{aktivak.length}</span> : null}
      </h2>

      {lista.length === 0 ? (
        <div className="fk-ures">
          <svg className="fk-ures-ikon" viewBox="0 0 48 48" aria-hidden="true">
            <path
              d="M6 14a4 4 0 0 1 4-4h28a4 4 0 0 1 4 4v5a5 5 0 0 0 0 10v5a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4v-5a5 5 0 0 0 0-10z"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path d="M30 12v24" stroke="currentColor" strokeWidth="3" strokeDasharray="3 4" />
          </svg>
          <p className="fk-ures-szoveg">
            {rejtett ? 'A fenti ajándékon kívül még nincs kódod.' : 'Még nincs kódod.'} A helyek kártyáján váltsd be a
            kedvezményt, vagy nézd meg a dropot.
          </p>
          <div className="fk-gombsor">
            <a className="fk-gomb-masod" href="/">
              Helyek böngészése
            </a>
            <a className="fk-gomb-masod" href="/drop/">
              Heti drop
            </a>
          </div>
        </div>
      ) : null}

      {lista.length > 0 && aktivak.length === 0 ? (
        <p className="fk-halvany-szoveg">Most nincs aktív kódod. A korábbiakat lent találod.</p>
      ) : null}

      {aktivak.length > 0 ? (
        <ul className="fk-jegyek">
          {aktivak.map((c) => (
            <li key={c.id}>
              <Jegy c={c} nev={nev(c.partner_slug)} onBevalt={onBevalt} dolgozik={dolgozik} />
            </li>
          ))}
        </ul>
      ) : null}

      {hiba ? (
        <p className="mozi-hiba" role="alert">
          {hiba}
        </p>
      ) : null}

      {korabbiak.length > 0 ? (
        <details className="fk-korabbiak" open={aktivak.length === 0 ? true : undefined}>
          <summary>
            <span>Korábbiak ({korabbiak.length})</span>
            <svg viewBox="0 0 24 24" width="1.1em" height="1.1em" aria-hidden="true">
              <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>
          <ul className="fk-jegyek">
            {korabbiak.map((c) => (
              <li key={c.id}>
                <Jegy c={c} nev={nev(c.partner_slug)} onBevalt={onBevalt} dolgozik={dolgozik} />
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  )
}

function Jegy({
  c,
  nev,
  onBevalt,
  dolgozik,
}: {
  c: Igenyles
  nev: string
  onBevalt: (c: Igenyles) => void
  dolgozik: boolean
}) {
  const allapot = csoport(c)
  const sz = szazalek({ jelveny: null, szoveg: c.szoveg })
  const foglalas = partnerek.get(c.partner_slug)?.bookingUrl
  const el = kepernyoEl(c)

  const datum =
    allapot === 'aktiv'
      ? el
        ? 'Beváltás folyamatban'
        : `Lejár: ${hataridoNap(c.lejarat)}.`
      : allapot === 'bevaltott'
        ? `Beváltva: ${IDOPONT.format(new Date(c.bevaltva ?? c.igenyelve))}`
        : `Lejárt: ${hataridoNap(c.lejarat)}.`

  return (
    <article className={`fk-jegy fk-jegy-${allapot}`}>
      <div className="fk-jegy-fej">
        <span className={`fk-jegy-szazalek${sz === null ? ' fk-jegy-szazalek-szo' : ''}`} aria-hidden="true">
          {sz !== null ? `−${sz}%` : '★'}
        </span>
        <div className="fk-jegy-nev">
          <h3>{nev}</h3>
          <p>
            {/* "15% kedvezmény" mar a matrican all, ilyenkor csak a tipus */}
            {/^\d+\s?% kedvezmény$/i.test(c.szoveg.trim()) ? TIPUS[c.tipus] : `${TIPUS[c.tipus]} · ${c.szoveg}`}
          </p>
        </div>
        <span className={`fk-chip fk-chip-${allapot}`}>{STATUSZ[allapot]}</span>
      </div>

      {c.kod && allapot === 'aktiv' ? <KodMasolo kod={c.kod} /> : null}
      {c.kod && allapot !== 'aktiv' ? <p className="fk-jegy-kod-halvany">{c.kod}</p> : null}

      <p className="fk-jegy-datum">
        {datum}
        {c.kod && allapot === 'aktiv' ? ' Foglaláskor írd be. 1 kód / foglalás.' : ''}
        {!c.kod && allapot === 'aktiv' && !el ? ' A pultnál váltható be.' : ''}
      </p>

      {allapot === 'aktiv' && c.kod && foglalas ? (
        <a className="fk-gomb-masod fk-jegy-gomb" href={foglalas} target="_blank" rel="noopener noreferrer">
          Foglalás az oldalukon
        </a>
      ) : null}

      {allapot === 'aktiv' && !c.kod ? (
        <button type="button" className="tn-kapszula mozi-gomb fk-jegy-cta" onClick={() => onBevalt(c)} disabled={dolgozik}>
          <span className="tn-gomb-felirat tn-gomb-felirat-sotet">{el ? 'Aktív beváltás megnyitása' : 'Beváltom'}</span>
        </button>
      ) : null}
    </article>
  )
}

/** A kod monospace betuvel, mellette masolas gomb (a CouponCode menete). */
export function KodMasolo({ kod }: { kod: string }) {
  const [kesz, setKesz] = useState(false)
  const ido = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(ido.current), [])

  async function masol() {
    try {
      await navigator.clipboard.writeText(kod)
    } catch {
      const mezo = document.createElement('textarea')
      mezo.value = kod
      mezo.setAttribute('readonly', '')
      mezo.style.position = 'fixed'
      mezo.style.opacity = '0'
      document.body.appendChild(mezo)
      mezo.select()
      document.execCommand('copy')
      document.body.removeChild(mezo)
    }
    setKesz(true)
    window.clearTimeout(ido.current)
    ido.current = window.setTimeout(() => setKesz(false), 2000)
  }

  return (
    <div className="fk-kod">
      <code className="fk-kod-szoveg">{kod}</code>
      <button type="button" className="fk-kod-gomb" onClick={() => void masol()} aria-label={`${kod} kód másolása`}>
        {kesz ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
        <span aria-live="polite">{kesz ? 'Kimásolva' : 'Másolás'}</span>
      </button>
    </div>
  )
}
