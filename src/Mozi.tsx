import MoziReszletek from './components/mozi/MoziReszletek'
import MoziHero from './components/mozi/MoziHero'
import { InstagramIcon } from './components/Icons'
import { useSzavazas } from './mozi/useSzavazas'

/**
 * Onallo filmszavazas oldal. Az Instagram linkhez es a megosztasi
 * elonezethez kell. A tartalom ugyanaz, mint a fooldali kiemelt blokke.
 */
export default function Mozi() {
  const szavazas = useSzavazas()

  return (
    <div className="relative min-h-dvh">
      <div className="oldal-hatter" />

      <div className="tartalom-szakasz">
        <div className="tartalom-arnyek" />

        <div className="relative z-10 mx-auto w-full max-w-[480px] px-5 pt-10 pb-12 md:max-w-[640px]">
          <a href="/" className="mozi-vissza">
            Vissza a SideQuest oldalára
          </a>

          <MoziHero className="mozi-hero" />

          <h1 className="mozi-cim">Te választod a filmet!</h1>

          {szavazas.lezart ? <p className="mozi-oldal-jelzes">A szavazás lezárult.</p> : null}

          <div className="mozi-oldal-panel">
            <div className="tn-panel-belso mozi-panel">
              <MoziReszletek szavazas={szavazas} teljesOra />
            </div>
          </div>

          <a
            className="tn-kapszula mozi-cta"
            href="https://instagram.com/side_quest.bp"
            target="_blank"
            rel="noopener noreferrer"
          >
            <InstagramIcon className="tn-kapszula-ikon" />
            <span className="tn-gomb-felirat tn-gomb-felirat-sotet">Kövess minket: @side_quest.bp</span>
          </a>
        </div>
      </div>
    </div>
  )
}
