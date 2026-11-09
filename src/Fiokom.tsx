import { useState } from 'react'
import partnersData from './data/partners.json'
import type { Partner } from './types'
import Felirat from './components/Felirat'
import CouponCode from './components/CouponCode'
import BelepesAblak from './components/fiok/BelepesAblak'
import { FiokHiba, belepesNyitasa, fiokTorlese, kijelentkezes, useFiok, valaszthat } from './fiok/fiok'
import { hataridoNap } from './fiok/ajanlatok'

/**
 * Fiokom oldal. A keret ugyanaz, mint a kulon /mozi oldale: vissza link,
 * nagy cim a falon, alatta a krem panel.
 *
 * Itt latszik a valasztott udvozlo ajandek a hataridovel, es amig nem
 * valasztott (vagy lejart), innen jut el az /ajandek/ oldalra.
 */
const nevek = new Map((partnersData as Partner[]).map((p) => [p.slug, p.name]))

const DATUM = new Intl.DateTimeFormat('hu-HU', {
  timeZone: 'Europe/Budapest',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

export default function Fiokom() {
  const fiok = useFiok()
  const ajandek = fiok.ajandek
  const kodok = (fiok.bevaltasok ?? []).filter((b) => b.code)
  const [torlesKerdes, setTorlesKerdes] = useState(false)
  const [dolgozik, setDolgozik] = useState(false)
  const [hiba, setHiba] = useState<string | null>(null)

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
    <div className="relative min-h-dvh">
      <div className="oldal-hatter" />

      <div className="tartalom-szakasz">
        <div className="tartalom-arnyek" />

        <div className="relative z-10 mx-auto w-full max-w-[480px] px-5 pt-10 pb-12 md:max-w-[640px]">
          <a href="/" className="mozi-vissza">
            Vissza a SideQuest oldalára
          </a>

          <h1 className="mozi-cim">Fiókom</h1>

          <div className="mozi-oldal-panel">
            <div className="tn-panel-belso mozi-panel">
              {/* Tarolt munkamenetnel a profil meg betoltodik, addig ez latszik */}
              {fiok.allapot === 'ismeretlen' || (fiok.allapot === 'bent' && fiok.email === null) ? (
                <p className="mozi-jelzes">Betöltés...</p>
              ) : null}

              {fiok.allapot === 'kint' ? (
                <>
                  <p className="mozi-jelzes">Nem vagy belépve. Lépj be az e-mail-címeddel, egy 6 jegyű kóddal.</p>
                  <button type="button" className="tn-kapszula mozi-gomb" onClick={belepesNyitasa}>
                    <span className="tn-gomb-felirat tn-gomb-felirat-sotet">Belépés</span>
                  </button>
                </>
              ) : null}

              {fiok.allapot === 'bent' && fiok.keresztnev === null && fiok.email !== null ? (
                <>
                  <p className="mozi-jelzes">Még nem adtad meg a keresztneved. Ehhez kell a kedvezmények beváltásához.</p>
                  <button type="button" className="tn-kapszula mozi-gomb" onClick={belepesNyitasa}>
                    <span className="tn-gomb-felirat tn-gomb-felirat-sotet">Kitöltöm</span>
                  </button>
                </>
              ) : null}

              {fiok.allapot === 'bent' && fiok.keresztnev !== null ? (
                <>
                  <h2 className="tn-panel-cim">
                    <Felirat szoveg={`Szia, ${fiok.keresztnev}!`} kicsi valtozat="sotet" className="mozi-fejlec" />
                  </h2>
                  {fiok.email ? <p className="mozi-jelzes">{fiok.email}</p> : null}

                  <div className="tn-panel-blokk">
                    <h2 className="tn-panel-cim">
                      <Felirat szoveg="Üdvözlő ajándék" kicsi valtozat="sotet" className="mozi-fejlec" />
                    </h2>
                    {ajandek === null ? <p className="mozi-jelzes">Betöltés...</p> : null}
                    {ajandek?.statusz === 'aktiv' ? (
                      <>
                        <ul className="fiok-lista">
                          <li>
                            <span className="fiok-lista-nev">{ajandek.partner}</span>
                            <span className="fiok-lista-adat">
                              {ajandek.pct}% · {ajandek.lejarat ? `${hataridoNap(ajandek.lejarat)}-ig` : ''}
                            </span>
                          </li>
                        </ul>
                        <a className="tn-kapszula mozi-gomb" href={`/${ajandek.partner_slug}/`}>
                          <span className="tn-gomb-felirat tn-gomb-felirat-sotet">Irány a kártyája</span>
                        </a>
                      </>
                    ) : null}
                    {ajandek?.statusz === 'bevaltott' ? (
                      <ul className="fiok-lista">
                        <li>
                          <span className="fiok-lista-nev">{ajandek.partner}</span>
                          <span className="fiok-lista-adat">
                            {ajandek.pct}% · beváltva{ajandek.bevaltva ? ` ${DATUM.format(new Date(ajandek.bevaltva))}` : ''}
                          </span>
                        </li>
                      </ul>
                    ) : null}
                    {valaszthat(ajandek) ? (
                      <>
                        <p className="mozi-jelzes">
                          {ajandek?.statusz === 'lejart'
                            ? 'Az ajándékod lejárt, mert 14 napon belül nem váltottad be. Válassz újat.'
                            : 'Még nem választottál üdvözlő ajándékot.'}
                        </p>
                        <a className="tn-kapszula mozi-gomb" href="/ajandek/">
                          <span className="tn-gomb-felirat tn-gomb-felirat-sotet">Ajándék választása</span>
                        </a>
                      </>
                    ) : null}
                  </div>

                  <div className="tn-panel-blokk">
                    <h2 className="tn-panel-cim">
                      <Felirat szoveg="Online kódjaid" kicsi valtozat="sotet" className="mozi-fejlec" />
                    </h2>
                    {kodok.length === 0 ? (
                      <p className="mozi-jelzes">Még nem kaptál online kódot.</p>
                    ) : (
                      kodok.map((b) => (
                        <div key={b.code} className="bev-kod-sor">
                          <p className="bev-kod-cimke">
                            {nevek.get(b.partner_slug) ?? b.partner_slug} · {b.tipus === 'welcome' ? 'üdvözlő' : 'havi'} kód ({b.pct}%)
                            <span>
                              {' '}
                              · {Date.parse(b.expires_at) > Date.now() ? `${DATUM.format(new Date(Date.parse(b.expires_at) - 1000)).replace(/\.$/, '')}-ig érvényes` : 'lejárt'}
                            </span>
                          </p>
                          <CouponCode code={b.code!} />
                        </div>
                      ))
                    )}
                  </div>

                  {hiba ? <p className="mozi-hiba">{hiba}</p> : null}

                  <button type="button" className="tn-kapszula mozi-gomb" onClick={kilepes} disabled={dolgozik}>
                    <span className="tn-gomb-felirat tn-gomb-felirat-sotet">Kijelentkezés</span>
                  </button>

                  <div className="tn-panel-blokk">
                    {torlesKerdes ? (
                      <>
                        <p className="mozi-hiba">
                          Biztosan törlöd a fiókod? A neved, az e-mail-címed és minden beváltásod végleg törlődik.
                        </p>
                        <div className="fiok-masodlagos">
                          <button type="button" className="fiok-szoveggomb fiok-veszely" onClick={torles} disabled={dolgozik}>
                            {dolgozik ? 'Törlés...' : 'Igen, törlöm'}
                          </button>
                          <button
                            type="button"
                            className="fiok-szoveggomb"
                            onClick={() => setTorlesKerdes(false)}
                            disabled={dolgozik}
                          >
                            Mégsem
                          </button>
                        </div>
                      </>
                    ) : (
                      <button type="button" className="fiok-szoveggomb fiok-veszely" onClick={() => setTorlesKerdes(true)}>
                        Fiók törlése
                      </button>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <BelepesAblak />
    </div>
  )
}
