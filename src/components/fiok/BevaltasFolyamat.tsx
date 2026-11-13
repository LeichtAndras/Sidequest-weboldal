import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import partnersData from '../../data/partners.json'
import type { Partner } from '../../types'
import { gorgetesZarolasa } from '../../fiok/gorgetesZar'
import { FiokHiba, alapBevaltasa, igenylesBevaltasa, type AktivBevaltas, type Igenyles } from '../../fiok/fiok'
import { useKinalat } from '../../fiok/kinalat'
import BevaltasKepernyo from './BevaltasKepernyo'

export const partnerek = new Map((partnersData as Partner[]).map((p) => [p.slug, p]))

export const TIPUS: Record<Igenyles['tipus'], string> = { alap: 'Kedvezmény', welcome: 'Üdvözlő ajándék', drop: 'Drop' }

/** A helyszini kepernyo 5 percig el a beváltás utan. */
export const kepernyoEl = (c: Igenyles) =>
  c.bevaltva !== null && !c.kod && Date.parse(c.bevaltva) + 5 * 60 * 1000 > Date.now()

/**
 * Aktiv:     meg bevalthato (welcome, drop a pultnal), ervenyes online kod,
 *            vagy az 5 percen belul ujranyithato kepernyo
 * Beváltott: a beváltás idejevel
 * Lejárt:    be nem valtott, lejart
 */
export function csoport(c: Igenyles): 'aktiv' | 'bevaltott' | 'lejart' {
  const most = Date.now()
  if (c.kod) return Date.parse(c.lejarat) > most ? 'aktiv' : 'bevaltott'
  if (c.bevaltva) return kepernyoEl(c) ? 'aktiv' : 'bevaltott'
  return Date.parse(c.lejarat) > most ? 'aktiv' : 'lejart'
}

/** A hely neve: elobb a partners.json, aztan a kinalat, vegul a slug. */
export function usePartnerNev() {
  const kinalat = useKinalat()
  return (slug: string) =>
    partnerek.get(slug)?.name ?? kinalat?.ajanlatok.find((a) => a.partner_slug === slug)?.partner ?? slug
}

/**
 * A pultnal torteno beváltás menete, egy helyen, hogy a Fiókom oldal
 * ajandek kartyaja es a Kódjaim lista ugyanazt hasznalja: megerosito ablak
 * ("Csak a pultnál nyomd meg!"), utana a teljes kepernyo. A logika
 * valtozatlan: alap kedvezmenynel alapBevaltasa (az ajanlattal), a
 * tobbinel igenylesBevaltasa. Az 5 percen belul ujranyitott kepernyo
 * megerosites nelkul nyilik.
 */
export function useBevaltas(): {
  inditas: (c: Igenyles) => void
  dolgozik: boolean
  hiba: string | null
  elemek: ReactNode
} {
  const nev = usePartnerNev()
  const [kerdes, setKerdes] = useState<Igenyles | null>(null)
  const [aktiv, setAktiv] = useState<AktivBevaltas | null>(null)
  const [dolgozik, setDolgozik] = useState(false)
  const [hiba, setHiba] = useState<string | null>(null)

  useEffect(() => {
    if (!kerdes) return
    const billentyu = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !dolgozik) setKerdes(null)
    }
    window.addEventListener('keydown', billentyu)
    // iOS-on is biztos zar, lasd gorgetesZar.ts
    const feloldas = gorgetesZarolasa()
    return () => {
      window.removeEventListener('keydown', billentyu)
      feloldas()
    }
  }, [kerdes, dolgozik])

  const bevalt = async (c: Igenyles) => {
    setDolgozik(true)
    setHiba(null)
    try {
      // Az alap kepernyo ujranyitasa az ajanlattal megy, a tobbi az igenylessel
      const k = c.tipus === 'alap' ? (await alapBevaltasa(c.offer_id)).kepernyo : await igenylesBevaltasa(c.id)
      setKerdes(null)
      setAktiv(k)
    } catch (h) {
      setHiba(h instanceof FiokHiba ? h.message : 'Nem sikerült a beváltás. Próbáld újra.')
    } finally {
      setDolgozik(false)
    }
  }

  const inditas = (c: Igenyles) => {
    setHiba(null)
    if (kepernyoEl(c)) void bevalt(c)
    else setKerdes(c)
  }

  const elemek = (
    <>
      {kerdes
        ? createPortal(
            <div
              className="fiok-retes ap-retes"
              role="dialog"
              aria-modal="true"
              aria-labelledby="bevaltas-cim"
              onClick={(e) => {
                if (e.target === e.currentTarget && !dolgozik) setKerdes(null)
              }}
            >
              <div className="fiok-lap mozi-oldal-panel ap-lap fk-lap">
                <div className="tn-panel-belso mozi-panel fiok-lap-belso ap-belso">
                  <span className="ap-fogo" aria-hidden="true" />
                  <p id="bevaltas-cim" className="bev-megerosites-cim">
                    Csak a pultnál nyomd meg!
                  </p>
                  <p className="mozi-jelzes">
                    {`${TIPUS[kerdes.tipus]}, ${nev(kerdes.partner_slug)}: ${kerdes.szoveg}. Egyszer használható: amint megnyomod, beváltottnak számít, és 5 percig látszik a képernyőn. Mutasd meg a pultnál. 1 kód / foglalás.`}
                  </p>
                  {hiba ? (
                    <p className="mozi-hiba" role="alert">
                      {hiba}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    className="tn-kapszula mozi-gomb ap-cta"
                    onClick={() => void bevalt(kerdes)}
                    disabled={dolgozik}
                  >
                    {dolgozik ? <span className="ap-porgo" aria-hidden="true" /> : null}
                    <span className="tn-gomb-felirat tn-gomb-felirat-sotet">
                      {dolgozik ? 'Pillanat...' : 'A pultnál vagyok, mutasd'}
                    </span>
                  </button>
                  <div className="fk-lap-also">
                    <button
                      type="button"
                      className="fiok-szoveggomb fk-szoveggomb"
                      onClick={() => setKerdes(null)}
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
      {aktiv ? <BevaltasKepernyo bevaltas={aktiv} onBezar={() => setAktiv(null)} /> : null}
    </>
  )

  return { inditas, dolgozik, hiba: kerdes ? null : hiba, elemek }
}
