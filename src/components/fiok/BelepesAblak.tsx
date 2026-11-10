import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import Felirat from '../Felirat'
import {
  FiokHiba,
  belepesBezarasa,
  kodEllenorzese,
  kodKuldese,
  profilMentese,
  useFiok,
} from '../../fiok/fiok'
import { useUjRendszer } from '../../fiok/kapcsolo'

type Lepes = 'email' | 'kod' | 'profil' | 'kesz'

/** Ennyi masodpercig nem lehet uj kodot kerni, hogy ne fussunk bele a korlatba. */
const UJ_KOD_VARAKOZAS = 60

/** A kod ennyi ideig ervenyes (Supabase: Email OTP Expiration = 600 mp). */
const KOD_ERVENYES = 10 * 60 * 1000

const uzenet = (hiba: unknown) =>
  hiba instanceof FiokHiba ? hiba.message : 'Valami félrement. Próbáld újra pár másodperc múlva.'

/**
 * Belepes es regisztracio egy ablakban. Link es Google-belepes nincs, mert
 * az Instagram beepitett bongeszojeben nem mukodnek: 6 jegyu kod megy
 * e-mailben. Ha a cim uj, a kod utan keresztnev es a ket elfogadas jon; az
 * uj rendszerben utana az /ajandek/ oldal, ahol az udvozlo ajandekot valasztja.
 *
 * Kinezet: a mozi szavazas krem panelje, mezoi es gombjai, uj stilus nincs.
 */
export default function BelepesAblak() {
  const fiok = useFiok()
  const uj = useUjRendszer()
  const azon = useId()

  const [lepes, setLepes] = useState<Lepes>('email')
  const [email, setEmail] = useState('')
  const [kod, setKod] = useState('')
  const [nev, setNev] = useState('')
  const [elmult16, setElmult16] = useState(false)
  const [elfogadja, setElfogadja] = useState(false)
  const [dolgozik, setDolgozik] = useState(false)
  const [hiba, setHiba] = useState<string | null>(null)
  const [varakozas, setVarakozas] = useState(0)
  const elsoMezo = useRef<HTMLInputElement>(null)
  // Kod lepes: mikor ment ki a kod, fut-e mar ellenorzes (szinkron, a dolgozik
  // mellett, hogy a gepeles es a beillesztes egyszerre se kuldje ketszer), es
  // az utolso rossz kod, amit nem kuldunk be ujra magatol
  const kodKuldveIdo = useRef(0)
  const ellenorzesFut = useRef(false)
  const utolsoRossz = useRef<string | null>(null)

  // Nyitaskor: ha mar be van lepve, de nincs profilja, rogton a profil jon
  useEffect(() => {
    if (!fiok.ablak) return
    setHiba(null)
    setLepes(fiok.allapot === 'bent' && fiok.keresztnev === null ? 'profil' : 'email')
  }, [fiok.ablak]) // eslint-disable-line react-hooks/exhaustive-deps

  // Escape zar, es amig nyitva van, a lap nem gorog alatta
  useEffect(() => {
    if (!fiok.ablak) return
    const billentyu = (e: KeyboardEvent) => {
      if (e.key === 'Escape') belepesBezarasa()
    }
    window.addEventListener('keydown', billentyu)
    const regi = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', billentyu)
      document.body.style.overflow = regi
    }
  }, [fiok.ablak])

  // Lepesvaltaskor az elso mezore ugrunk, telefonon igy rogton jon a billentyuzet
  useEffect(() => {
    if (fiok.ablak) elsoMezo.current?.focus()
  }, [lepes, fiok.ablak])

  useEffect(() => {
    if (varakozas <= 0) return
    const ido = window.setTimeout(() => setVarakozas((v) => v - 1), 1000)
    return () => window.clearTimeout(ido)
  }, [varakozas])

  if (!fiok.ablak) return null

  async function futtat(munka: () => Promise<void>) {
    setDolgozik(true)
    setHiba(null)
    try {
      await munka()
    } catch (h) {
      setHiba(uzenet(h))
    } finally {
      setDolgozik(false)
    }
  }

  const kuldes = (e?: FormEvent) => {
    e?.preventDefault()
    void futtat(async () => {
      await kodKuldese(email)
      kodKuldveIdo.current = Date.now()
      utolsoRossz.current = null
      setKod('')
      setVarakozas(UJ_KOD_VARAKOZAS)
      setLepes('kod')
    })
  }

  // A kod ellenorzese. Egyszerre csak egy fut. Rossz kodnal (a 10 perces
  // ervenyessegen belul) a mezo kiurul, es a fokusz marad, igy a billentyuzet
  // nyitva marad; lejart kodnal a regi uzenet jon.
  const ellenoriz = (beirt: string) => {
    if (ellenorzesFut.current || dolgozik) return
    ellenorzesFut.current = true
    setDolgozik(true)
    setHiba(null)
    void (async () => {
      try {
        const { ujFiok } = await kodEllenorzese(email, beirt)
        setLepes(ujFiok ? 'profil' : 'kesz')
      } catch (h) {
        if (h instanceof FiokHiba && h.ok === 'hibas_kod' && Date.now() - kodKuldveIdo.current < KOD_ERVENYES) {
          setHiba('Hibás kód, próbáld újra')
          utolsoRossz.current = beirt
          setKod('')
          elsoMezo.current?.focus()
        } else {
          setHiba(uzenet(h))
        }
      } finally {
        ellenorzesFut.current = false
        setDolgozik(false)
      }
    })()
  }

  const ellenorzes = (e: FormEvent) => {
    e.preventDefault()
    ellenoriz(kod)
  }

  // Szokozok es mas jelek nelkul (pl. beillesztett "596 466"). Az uj
  // rendszerben 6 szamjegynel magatol bekuldi: gepelve, beillesztve vagy az
  // iOS "Mailből" javaslatabol. A rossz kodot nem kuldi be ujra magatol.
  const kodValtozas = (ertek: string) => {
    const tiszta = ertek.replace(/\D/g, '').slice(0, 6)
    setKod(tiszta)
    if (uj && tiszta.length === 6 && tiszta !== utolsoRossz.current) ellenoriz(tiszta)
  }

  const mentes = (e: FormEvent) => {
    e.preventDefault()
    void futtat(async () => {
      await profilMentese(nev, elmult16, elfogadja)
      // Uj regisztracio: az uj rendszerben rogton az ajandek valasztasa jon,
      // kulonben (pl. az eles /fiokom/ oldalon) a regi "kesz" lepes
      if (!uj) {
        setLepes('kesz')
      } else if (window.location.pathname.replace(/\/+$/, '') === '/ajandek') {
        belepesBezarasa()
      } else {
        window.location.assign('/ajandek/')
      }
    })
  }

  const kodJo = /^\d{6}$/.test(kod)

  return (
    <div
      className="fiok-retes"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${azon}-cim`}
      onClick={(e) => {
        if (e.target === e.currentTarget) belepesBezarasa()
      }}
    >
      <div className="fiok-lap mozi-oldal-panel">
        <div className="tn-panel-belso mozi-panel fiok-lap-belso">
          <button type="button" className="fiok-zaro" onClick={belepesBezarasa} aria-label="Bezárás">
            <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </button>

          {lepes === 'email' ? (
            <form onSubmit={kuldes} noValidate>
              <h2 id={`${azon}-cim`} className="tn-panel-cim">
                <Felirat szoveg="Belépés" kicsi valtozat="sotet" className="mozi-fejlec" />
              </h2>
              <p className="mozi-jelzes">
                Írd be az e-mail-címed, és küldünk egy 6 jegyű kódot. Jelszó nem kell, és ha még nincs fiókod,
                ezzel létre is hozod.
              </p>
              <label className="mozi-cimke" htmlFor={`${azon}-email`}>
                E-mail-cím
              </label>
              <input
                ref={elsoMezo}
                id={`${azon}-email`}
                className="mozi-mezo fiok-mezo"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="pelda@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={dolgozik}
              />
              {hiba ? <p className="mozi-hiba">{hiba}</p> : null}
              <button
                type="submit"
                className="tn-kapszula mozi-gomb"
                disabled={dolgozik || !/^\S+@\S+\.\S+$/.test(email.trim())}
              >
                <span className="tn-gomb-felirat tn-gomb-felirat-sotet">{dolgozik ? 'Küldés...' : 'Kód küldése'}</span>
              </button>
            </form>
          ) : null}

          {lepes === 'kod' ? (
            <form onSubmit={ellenorzes} noValidate>
              <h2 id={`${azon}-cim`} className="tn-panel-cim">
                <Felirat szoveg="Írd be a kódot" kicsi valtozat="sotet" className="mozi-fejlec" />
              </h2>
              <p className="mozi-jelzes">
                Elküldtük a 6 jegyű kódot ide: <strong>{email.trim()}</strong>. Ha nem látod, nézd meg a spam mappát is.
              </p>
              <label className="mozi-cimke" htmlFor={`${azon}-kod`}>
                Kód
              </label>
              <input
                ref={elsoMezo}
                id={`${azon}-kod`}
                className="mozi-mezo fiok-mezo fiok-kod"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                placeholder="123456"
                value={kod}
                onChange={(e) => kodValtozas(e.target.value)}
                // Ellenorzes kozben csak olvashato, nem tiltott: igy a fokusz es
                // a billentyuzet megmarad
                readOnly={dolgozik}
              />
              {hiba ? <p className="mozi-hiba">{hiba}</p> : null}
              <button type="submit" className="tn-kapszula mozi-gomb" disabled={dolgozik || !kodJo}>
                <span className="tn-gomb-felirat tn-gomb-felirat-sotet">{dolgozik ? 'Ellenőrzés...' : 'Belépés'}</span>
              </button>
              <div className="fiok-masodlagos">
                <button type="button" className="fiok-szoveggomb" onClick={() => kuldes()} disabled={dolgozik || varakozas > 0}>
                  {varakozas > 0 ? `Új kód ${varakozas} mp múlva` : 'Új kód küldése'}
                </button>
                <button
                  type="button"
                  className="fiok-szoveggomb"
                  onClick={() => {
                    setHiba(null)
                    setLepes('email')
                  }}
                  disabled={dolgozik}
                >
                  Másik e-mail-cím
                </button>
              </div>
            </form>
          ) : null}

          {lepes === 'profil' ? (
            <form onSubmit={mentes} noValidate>
              <h2 id={`${azon}-cim`} className="tn-panel-cim">
                <Felirat szoveg="Még egy lépés" kicsi valtozat="sotet" className="mozi-fejlec" />
              </h2>
              <p className="mozi-jelzes">A keresztneved a kedvezmény beváltásakor jelenik meg, ezt látja a pénztáros.</p>
              <label className="mozi-cimke" htmlFor={`${azon}-nev`}>
                Keresztnév
              </label>
              <input
                ref={elsoMezo}
                id={`${azon}-nev`}
                className="mozi-mezo fiok-mezo"
                type="text"
                autoComplete="given-name"
                maxLength={40}
                placeholder="Pl. Anna"
                value={nev}
                onChange={(e) => setNev(e.target.value)}
                disabled={dolgozik}
              />

              <label className="fiok-pipa">
                <input type="checkbox" checked={elmult16} onChange={(e) => setElmult16(e.target.checked)} disabled={dolgozik} />
                <span>Elmúltam 16 éves</span>
              </label>
              <label className="fiok-pipa">
                <input
                  type="checkbox"
                  checked={elfogadja}
                  onChange={(e) => setElfogadja(e.target.checked)}
                  disabled={dolgozik}
                />
                <span>
                  Elfogadom az{' '}
                  <a href="/adatkezeles/" target="_blank" rel="noopener">
                    adatkezelési tájékoztatót
                  </a>
                </span>
              </label>

              {hiba ? <p className="mozi-hiba">{hiba}</p> : null}
              <button
                type="submit"
                className="tn-kapszula mozi-gomb"
                disabled={dolgozik || nev.trim() === '' || !elmult16 || !elfogadja}
              >
                <span className="tn-gomb-felirat tn-gomb-felirat-sotet">{dolgozik ? 'Mentés...' : 'Kész'}</span>
              </button>
            </form>
          ) : null}

          {lepes === 'kesz' ? (
            <div>
              <h2 id={`${azon}-cim`} className="tn-panel-cim">
                <Felirat szoveg={`Szia, ${fiok.keresztnev ?? ''}!`} kicsi valtozat="sotet" className="mozi-fejlec" />
              </h2>
              <p className="mozi-jelzes">Be vagy lépve. Ezen a telefonon bejelentkezve maradsz, nem kell mindig újra belépned.</p>
              <button type="button" className="tn-kapszula mozi-gomb" onClick={belepesBezarasa}>
                <span className="tn-gomb-felirat tn-gomb-felirat-sotet">Mehet</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
