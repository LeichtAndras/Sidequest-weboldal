/**
 * Adatkezelesi tajekoztato. Egyelore helykitolto: a tenyleges jogi szoveg
 * meg nincs meg. Ami itt all, az csak az, amit a kod valoban tarol.
 *
 * TODO: a vegleges tajekoztato (adatkezelo neve es elerhetosege, jogalap,
 * megorzesi ido, jogorvoslat). Jogi szoveget nem irunk kitalalva.
 */
export default function Adatkezeles() {
  return (
    <div className="relative min-h-dvh">
      <div className="oldal-hatter" />

      <div className="tartalom-szakasz">
        <div className="tartalom-arnyek" />

        <div className="relative z-10 mx-auto w-full max-w-[480px] px-5 pt-10 pb-12 md:max-w-[640px]">
          <a href="/" className="mozi-vissza">
            Vissza a SideQuest oldalára
          </a>

          <h1 className="mozi-cim">Adatkezelési tájékoztató</h1>

          <div className="mozi-oldal-panel">
            <div className="tn-panel-belso mozi-panel">
              <p className="tn-panel-szoveg">
                A teljes adatkezelési tájékoztató hamarosan itt lesz.

                {'\n\n'}Amit a fiókodhoz tárolunk: az e-mail-címed, a keresztneved, és hogy mikor erősítetted meg, hogy elmúltál 16 éves, illetve mikor fogadtad el ezt a tájékoztatót. A kedvezmények beváltásakor azt is, melyik helyen és mikor váltottál be kedvezményt.

                {'\n\n'}A fiókodat és vele minden adatodat bármikor törölheted a Fiókom oldalon.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
