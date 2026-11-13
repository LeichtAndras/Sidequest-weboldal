import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import BelepesAblak from './BelepesAblak'
import Kodjaim, { KodMasolo } from './Kodjaim'
import AjandekKartya, { legnagyobbSzazalek, szazalek } from './AjandekKartya'
import { kepernyoEl, partnerek, useBevaltas, usePartnerNev } from './BevaltasFolyamat'
import { gorgetesZarolasa } from '../../fiok/gorgetesZar'
import {
  FiokHiba,
  belepesNyitasa,
  fiokTorlese,
  igenylesekBetoltese,
  kijelentkezes,
  useFiok,
  welcomeAllapot,
  type Igenyles,
  type WelcomeAllapot,
} from '../../fiok/fiok'
import { hataridoNap, useKinalat } from '../../fiok/kinalat'

const NAP_MS = 24 * 60 * 60 * 1000

/**
 * A Fiókom oldal az uj rendszerben (csak ?uj=1 / tesztelo, amig nincs
 * elesites). Fent a fejlec (monogram, nev, e-mail), alatta kulon krem
 * kartyakon az udvozlo ajandek es a Kódjaim, legalul a kijelentkezes es a
 * fioktorles. A beváltás, a valasztas es a torles logikaja ugyanaz, mint
 * eddig; ez csak a megjelenes.
 */
export default function FiokomUj() {
  const fiok = useFiok()
  const bevaltas = useBevaltas()
  const w = welcomeAllapot(fiok.igenylesek)

  const betolt = fiok.allapot === 'ismeretlen' || (fiok.allapot === 'bent' && fiok.email === null)
  const kesz = fiok.allapot === 'bent' && fiok.keresztnev !== null && fiok.email !== null

  return (
    <div className="relative min-h-dvh fk-oldal">
      <div className="oldal-hatter" />
      <div className="fk-felso-sotet" aria-hidden="true" />

      <div className="tartalom-szakasz">
        <div className="tartalom-arnyek" />

        <main className="fk-tartalom" aria-busy={betolt || (kesz && fiok.igenylesek === null)}>
          <a href="/" className="fk-vissza">
            <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
              <path d="M19 12H6M11 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Vissza a SideQuest oldalára
          </a>

          <h1 className="fk-oldalcim">Fiókom</h1>

          {betolt ? <Vaz /> : null}

          {fiok.allapot === 'kint' ? (
            <section className="fk-kartya">
              <h2 className="fk-szakasz-cim">Nem vagy belépve</h2>
              <p className="fk-szoveg">Lépj be az e-mail-címeddel, egy 6 jegyű kóddal. Jelszó nem kell.</p>
              <button type="button" className="tn-kapszula mozi-gomb ap-cta fk-fo-gomb" onClick={belepesNyitasa}>
                <span className="tn-gomb-felirat tn-gomb-felirat-sotet">Belépés</span>
              </button>
            </section>
          ) : null}

          {fiok.allapot === 'bent' && fiok.keresztnev === null && fiok.email !== null ? (
            <>
              <Fejlec nev={null} email={fiok.email} />
              <section className="fk-kartya">
                <h2 className="fk-szakasz-cim">Még egy lépés</h2>
                <p className="fk-szoveg">Még nem adtad meg a keresztneved. Ehhez kell a kedvezmények beváltásához.</p>
                <button type="button" className="tn-kapszula mozi-gomb ap-cta fk-fo-gomb" onClick={belepesNyitasa}>
                  <span className="tn-gomb-felirat tn-gomb-felirat-sotet">Kitöltöm</span>
                </button>
              </section>
              <FiokMuveletek />
            </>
          ) : null}

          {kesz ? (
            <>
              <Fejlec nev={fiok.keresztnev} email={fiok.email} />

              {fiok.igenylesek === null ? (
                <>
                  <VazKartya magas />
                  <VazKartya />
                </>
              ) : fiok.igenylesHiba ? (
                <BetoltesiHiba />
              ) : (
                <>
                  <Ajandek w={w} onBevalt={bevaltas.inditas} dolgozik={bevaltas.dolgozik} />
                  <Kodjaim
                    onBevalt={bevaltas.inditas}
                    dolgozik={bevaltas.dolgozik}
                    hiba={bevaltas.hiba}
                    rejtett={w?.statusz === 'aktiv' ? (w.igenyles?.id ?? null) : null}
                  />
                </>
              )}

              <FiokMuveletek />
            </>
          ) : null}
        </main>
      </div>

      {bevaltas.elemek}
      <BelepesAblak />
    </div>
  )
}

/** Fejlec: monogram, nagy nev, halvany e-mail. */
function Fejlec({ nev, email }: { nev: string | null; email: string | null }) {
  const kezdo = (nev ?? email ?? '?').trim().charAt(0).toLocaleUpperCase('hu-HU')
  return (
    <header className="fk-fejlec">
      <span className="fk-avatar" aria-hidden="true">
        {kezdo}
      </span>
      <div className="fk-fejlec-szoveg">
        <p className="fk-nev">{nev ? `Szia, ${nev}!` : 'Szia!'}</p>
        {email ? <p className="fk-email">{email}</p> : null}
      </div>
    </header>
  )
}

/** Betoltes kozben: a fejlec es ket kartya korvonala. */
function Vaz() {
  return (
    <>
      <div className="fk-fejlec" aria-hidden="true">
        <span className="fk-avatar fk-vaz-kor" />
        <div className="fk-fejlec-szoveg">
          <span className="fk-vaz fk-vaz-nev" />
          <span className="fk-vaz fk-vaz-email" />
        </div>
      </div>
      <VazKartya magas />
      <VazKartya />
      <p className="sr-only" role="status">
        Betöltés...
      </p>
    </>
  )
}

function VazKartya({ magas }: { magas?: boolean }) {
  return (
    <div className="fk-kartya fk-vaz-kartya" aria-hidden="true">
      <span className="fk-vaz fk-vaz-cim" />
      <span className={`fk-vaz fk-vaz-doboz${magas ? ' fk-vaz-doboz-magas' : ''}`} />
      <span className="fk-vaz fk-vaz-sor" />
    </div>
  )
}

function BetoltesiHiba() {
  const [dolgozik, setDolgozik] = useState(false)
  return (
    <section className="fk-kartya fk-hiba-kartya" role="alert">
      <span className="fk-hiba-ikon" aria-hidden="true">
        !
      </span>
      <h2 className="fk-szakasz-cim">Ez most nem jött össze</h2>
      <p className="fk-szoveg">Nem sikerült betölteni a kódjaidat. Nézd meg, van-e net, és próbáld újra.</p>
      <button
        type="button"
        className="fk-gomb-masod"
        disabled={dolgozik}
        onClick={async () => {
          setDolgozik(true)
          await igenylesekBetoltese().catch(() => {})
          setDolgozik(false)
        }}
      >
        {dolgozik ? 'Pillanat...' : 'Újrapróbálom'}
      </button>
    </section>
  )
}

/** Hany nap van meg hatra (felfele kerekitve, legalabb 0). */
const hatraNap = (iso: string) => Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / NAP_MS))

/**
 * Az udvozlo ajandek kartyaja negy allapotban:
 *   nincs:     kek kartya "akár X%" matricaval, gomb az /ajandek/ oldalra
 *   aktiv:     a valasztott hely kartyaja, hatarido, kod vagy beváltás gomb
 *   lejart:    halvany, rovid uzenet; ujra valaszthat (eddig is igy volt)
 *   bevaltott: halvany, rovid uzenet
 */
function Ajandek({
  w,
  onBevalt,
  dolgozik,
}: {
  w: WelcomeAllapot | null
  onBevalt: (c: Igenyles) => void
  dolgozik: boolean
}) {
  const kinalat = useKinalat()
  const nev = usePartnerNev()
  if (!w) return null

  if (w.statusz === 'nincs') {
    const max = legnagyobbSzazalek((kinalat?.ajanlatok ?? []).filter((a) => a.tipus === 'welcome'))
    return (
      <section className="fk-ajandek" aria-labelledby="ajandek-cim">
        <span className="fk-ajandek-matrica" aria-hidden="true">
          {max !== null ? (
            <>
              <small>akár</small>
              {max}%
            </>
          ) : (
            'Ajándék'
          )}
        </span>
        <h2 id="ajandek-cim" className="fk-ajandek-cim">
          Üdvözlő ajándék
        </h2>
        <p className="fk-ajandek-szoveg">Egyszeri ajándék a regisztrációért: válassz egy helyet, és ott beváltod a kedvezményt.</p>
        <a className="tn-kapszula mozi-gomb fk-ajandek-cta" href="/ajandek/">
          <span className="tn-gomb-felirat tn-gomb-felirat-sotet">Ajándék választása</span>
          <svg viewBox="0 0 24 24" width="1.1em" height="1.1em" aria-hidden="true">
            <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </section>
    )
  }

  const c = w.igenyles
  if (!c) return null
  const hely = nev(c.partner_slug)
  const sz = szazalek({ jelveny: null, szoveg: c.szoveg })

  if (w.statusz === 'aktiv') {
    const napok = hatraNap(c.lejarat)
    const hatra = napok <= 1 ? `Utolsó nap: ${hataridoNap(c.lejarat)}` : `Még ${napok} nap · ${hataridoNap(c.lejarat)}-ig`
    const foglalas = partnerek.get(c.partner_slug)?.bookingUrl
    return (
      <section className="fk-kartya" aria-labelledby="ajandek-cim">
        <div className="fk-szakasz-fej">
          <h2 id="ajandek-cim" className="fk-szakasz-cim">
            Üdvözlő ajándék
          </h2>
          <span className="fk-chip fk-chip-aktiv">Aktív</span>
        </div>
        <AjandekKartya
          ajanlat={{ partner_slug: c.partner_slug, partner: hely, szoveg: c.szoveg, jelveny: null, keret: 1, szabad: 1 }}
          max={sz}
          alsoSor={hatra}
          statikus
        />
        {c.kod ? (
          <>
            <p className="fk-szoveg">Foglaláskor írd be ezt a kódot. 1 kód / foglalás.</p>
            <KodMasolo kod={c.kod} />
            {foglalas ? (
              <a className="tn-kapszula mozi-gomb ap-cta fk-fo-gomb" href={foglalas} target="_blank" rel="noopener noreferrer">
                <span className="tn-gomb-felirat tn-gomb-felirat-sotet">Foglalás az oldalukon</span>
              </a>
            ) : null}
          </>
        ) : (
          <>
            <p className="fk-szoveg">
              A pultnál váltod be: ott nyomd meg a gombot, és mutasd a képernyőt. A kódod is ott jelenik meg.
            </p>
            <button type="button" className="tn-kapszula mozi-gomb ap-cta fk-fo-gomb" onClick={() => onBevalt(c)} disabled={dolgozik}>
              <span className="tn-gomb-felirat tn-gomb-felirat-sotet">Beváltom a pultnál</span>
            </button>
          </>
        )}
      </section>
    )
  }

  // Lejart vagy beváltott: halvany, rovid uzenet
  const el = kepernyoEl(c)
  return (
    <section className="fk-kartya fk-kartya-halvany" aria-labelledby="ajandek-cim">
      <div className="fk-szakasz-fej">
        <h2 id="ajandek-cim" className="fk-szakasz-cim">
          Üdvözlő ajándék
        </h2>
        <span className={`fk-chip fk-chip-${w.statusz}`}>{w.statusz === 'lejart' ? 'Lejárt' : 'Beváltva'}</span>
      </div>
      <p className="fk-szoveg">
        {w.statusz === 'lejart'
          ? `Lejárt az ajándékod (${hely}), mert nem váltottad be ${hataridoNap(c.lejarat)}-ig. Választhatsz újat.`
          : `Beváltottad: ${hely}${sz !== null ? `, −${sz}%` : ''}. Az üdvözlő ajándék egyszeri, ez megvolt.`}
      </p>
      {w.statusz === 'lejart' ? (
        <a className="fk-gomb-masod" href="/ajandek/">
          Új ajándék választása
        </a>
      ) : null}
      {el ? (
        <button type="button" className="fk-gomb-masod" onClick={() => onBevalt(c)} disabled={dolgozik}>
          Aktív beváltás megnyitása
        </button>
      ) : null}
    </section>
  )
}

/** Kijelentkezes (szellemgomb) es fioktorles (kis piros link, megerosito ablakkal). */
function FiokMuveletek() {
  const [kerdes, setKerdes] = useState(false)
  const [dolgozik, setDolgozik] = useState(false)
  const [hiba, setHiba] = useState<string | null>(null)

  useEffect(() => {
    if (!kerdes) return
    const billentyu = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !dolgozik) setKerdes(false)
    }
    window.addEventListener('keydown', billentyu)
    const feloldas = gorgetesZarolasa()
    return () => {
      window.removeEventListener('keydown', billentyu)
      feloldas()
    }
  }, [kerdes, dolgozik])

  const torles = async () => {
    setDolgozik(true)
    setHiba(null)
    try {
      await fiokTorlese()
      window.location.href = '/'
    } catch (h) {
      setHiba(h instanceof FiokHiba ? h.message : 'Nem sikerült törölni a fiókot. Próbáld újra.')
      setDolgozik(false)
    }
  }

  const kilepes = async () => {
    setDolgozik(true)
    await kijelentkezes()
    window.location.href = '/'
  }

  return (
    <div className="fk-muveletek">
      <button type="button" className="fk-gomb-szellem" onClick={kilepes} disabled={dolgozik}>
        Kijelentkezés
      </button>
      <button
        type="button"
        className="fk-torles-link"
        onClick={() => {
          setHiba(null)
          setKerdes(true)
        }}
        disabled={dolgozik}
      >
        Fiók törlése
      </button>

      {kerdes
        ? createPortal(
            <div
              className="fiok-retes ap-retes"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="torles-cim"
              aria-describedby="torles-szoveg"
              onClick={(e) => {
                if (e.target === e.currentTarget && !dolgozik) setKerdes(false)
              }}
            >
              <div className="fiok-lap mozi-oldal-panel ap-lap fk-lap">
                <div className="tn-panel-belso mozi-panel fiok-lap-belso ap-belso">
                  <span className="ap-fogo" aria-hidden="true" />
                  <h2 id="torles-cim" className="fk-modal-cim">
                    Biztosan törlöd?
                  </h2>
                  <p id="torles-szoveg" className="fk-szoveg">
                    Ez nem visszavonható. A neved, az e-mail-címed és minden beváltásod végleg törlődik.
                  </p>
                  {hiba ? (
                    <p className="mozi-hiba" role="alert">
                      {hiba}
                    </p>
                  ) : null}
                  <button type="button" className="fk-gomb-veszely" onClick={torles} disabled={dolgozik}>
                    {dolgozik ? <span className="ap-porgo fk-porgo-feher" aria-hidden="true" /> : null}
                    {dolgozik ? 'Törlés...' : 'Igen, törlöm a fiókom'}
                  </button>
                  <div className="fk-lap-also">
                    <button
                      type="button"
                      className="fiok-szoveggomb fk-szoveggomb"
                      onClick={() => setKerdes(false)}
                      disabled={dolgozik}
                      autoFocus
                    >
                      Mégsem
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
