import { memo, useState } from 'react'
import type { Partner } from '../types'
import { ujPartner } from '../partner'
import ThumbDetails from './ThumbDetails'
import { QrIcon, SpeechIcon, TagIcon } from './Icons'

type Props = {
  partner: Partner
  open: boolean
  onToggle: () => void
}

/** A kedvezmeny badge csillag alakja. Minden kartyan ugyanaz. */
function robbanasUt(agak = 13, kulsoX = 63, kulsoY = 45, aranyBelso = 0.755) {
  const pontok: string[] = []
  for (let i = 0; i < agak * 2; i++) {
    const kulso = i % 2 === 0 ? 1 : aranyBelso
    const tenyezo = kulso * (1 + 0.07 * Math.sin(i * 2.3))
    const szog = (Math.PI * i) / agak - Math.PI / 2
    pontok.push(
      `${(70 + kulsoX * tenyezo * Math.cos(szog)).toFixed(2)},${(50 + kulsoY * tenyezo * Math.sin(szog)).toFixed(2)}`,
    )
  }
  return `M${pontok.join('L')}Z`
}

const ROBBANAS = robbanasUt()

/** A bevaltas modja: harom lehetoseg, mindig ugyanazokkal a szavakkal. */
function bevaltasMod(partner: Partner) {
  if (partner.code) return { szoveg: 'Online kuponkód', Ikon: TagIcon }
  if (partner.redeem.includes('QR')) return { szoveg: 'QR a helyszínen', Ikon: QrIcon }
  return { szoveg: 'Mondd: SideQuest', Ikon: SpeechIcon }
}

function vanReszlet(partner: Partner) {
  return Boolean(
    partner.description?.trim() ||
      partner.address?.trim() ||
      partner.conditions?.trim() ||
      partner.steps?.some((lepes) => lepes.trim() !== ''),
  )
}

/** A kisebb valtozat fajlneve: "base-bar.webp" -> "base-bar-640.webp". */
function kisebbKep(fajl: string) {
  return fajl.replace(/\.webp$/, '-640.webp')
}

/**
 * Helyszinkartya. Minden helyre ugyanez a felepites: eles foto a teljes
 * kartyan, alul sotetedo gradient, bal felul kategoria, jobb felul
 * kedvezmeny, alul a nev es egy sorban a bevaltas chip meg a Tobb gomb.
 */
function ThumbCard({ partner, open, onToggle }: Props) {
  const [kepHiba, setKepHiba] = useState(false)

  const lenyithato = vanReszlet(partner)
  const panelId = `reszletek-${partner.slug}`
  const cimke = ujPartner(partner) ? `ÚJ · ${partner.category}` : partner.category
  const bevaltas = bevaltasMod(partner)
  const kep = partner.venue && !kepHiba ? `/venues/${partner.venue}` : null

  return (
    <article id={`partner-${partner.slug}`} className="hk-kartya scroll-mt-6">
      <div className="hk-lap">
        {kep ? (
          <img
            className="hk-foto"
            src={kep}
            srcSet={`/venues/${kisebbKep(partner.venue!)} 640w, ${kep} 960w`}
            sizes="(min-width: 768px) 440px, 92vw"
            alt={partner.name}
            loading="lazy"
            decoding="async"
            onError={() => setKepHiba(true)}
          />
        ) : null}

        <div className="hk-arnyek" />

        <span className="hk-kategoria">{cimke}</span>

        <div className="hk-kedvezmeny">
          <svg viewBox="0 0 140 100" aria-hidden="true">
            <path d={ROBBANAS} fill="#FF2D78" stroke="#0B1B3A" strokeWidth="3.4" strokeLinejoin="round" />
          </svg>
          <span className="hk-kedvezmeny-szoveg">
            <span className="hk-kedvezmeny-szam">{partner.discount}</span>
            <span className="hk-kedvezmeny-felirat">Kedvezmény</span>
          </span>
        </div>

        <div className="hk-also">
          <h3 className="hk-nev">{partner.name}</h3>

          <div className="hk-sor">
            <span className="hk-chip">
              <bevaltas.Ikon className="hk-chip-ikon" />
              {bevaltas.szoveg}
            </span>

            {lenyithato ? (
              <button
                type="button"
                className="tn-kapszula hk-tobb"
                onClick={onToggle}
                aria-expanded={open}
                aria-controls={panelId}
              >
                <span className="tn-gomb-felirat tn-gomb-felirat-sotet" style={{ fontSize: '4cqw' }}>
                  {open ? 'Vissza' : 'Több'}
                </span>
                <svg
                  viewBox="0 0 24 24"
                  width="1em"
                  height="1em"
                  aria-hidden="true"
                  style={{
                    fontSize: '4.4cqw',
                    transform: open ? 'rotate(180deg)' : 'none',
                    transition: 'transform 200ms ease',
                  }}
                >
                  <path
                    d="M12 4v13m0 0 6-6m-6 6-6-6"
                    fill="none"
                    stroke="#0B1B3A"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {lenyithato ? (
        <div id={panelId} inert={!open} className={`tn-panel ${open ? 'tn-panel-nyitva' : ''}`}>
          <div>
            <ThumbDetails partner={partner} />
          </div>
        </div>
      ) : null}
    </article>
  )
}

export default memo(ThumbCard)
