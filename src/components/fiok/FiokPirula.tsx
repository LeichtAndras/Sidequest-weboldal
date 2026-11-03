import { belepesNyitasa, useFiok } from '../../fiok/fiok'

/**
 * A hero jobb felso sarka: "Belépés", vagy belepve "Fiókom". A gomb a
 * meglevo kek kapszula stilusat koveti, fix meretben, mert a hero nem
 * kontener.
 *
 * A szerveren meg nem tudjuk, be van-e lepve valaki, ezert ott "Belépés"
 * all. A bongeszo a tarolt munkamenetbol rogton tudja, igy a belepett
 * latogatonal a festes elott mar "Fiókom" lesz belole.
 */
export default function FiokPirula() {
  const fiok = useFiok()

  if (fiok.allapot === 'bent') {
    return (
      <a href="/fiokom/" className="tn-kapszula fiok-pirula">
        <span className="tn-gomb-felirat tn-gomb-felirat-sotet">Fiókom</span>
      </a>
    )
  }

  return (
    <button type="button" className="tn-kapszula fiok-pirula" onClick={belepesNyitasa}>
      <span className="tn-gomb-felirat tn-gomb-felirat-sotet">Belépés</span>
    </button>
  )
}
