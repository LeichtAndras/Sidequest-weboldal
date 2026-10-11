import { memo, useEffect, useState } from 'react'

/** Ennyi marad hatra, amikor az utolso nap elkezdodik. */
const UTOLSO_NAP = 24 * 60 * 60 * 1000

type Props = {
  /** Mire szamolunk vissza, ezredmasodpercben. */
  cel: number
  /** Akkor hivjuk, amikor a cel elerkezett. */
  onLejart?: () => void
  /** Egyszer hivjuk, amikor 24 oranal kevesebb marad. */
  onUtolsoNap?: () => void
  /** "rovid": egy sor szoveg. "ora": 07:00:52:10. Alapertelmezes: negy blokk. */
  valtozat?: 'blokkok' | 'rovid' | 'ora'
}

type Bontas = { nap: number; ora: number; perc: number; mp: number }

function bontas(maradek: number): Bontas {
  const mp = Math.max(0, Math.floor(maradek / 1000))
  return {
    nap: Math.floor(mp / 86400),
    ora: Math.floor((mp % 86400) / 3600),
    perc: Math.floor((mp % 3600) / 60),
    mp: mp % 60,
  }
}

const CIMKEK: Array<[keyof Bontas, string]> = [
  ['nap', 'nap'],
  ['ora', 'óra'],
  ['perc', 'perc'],
  ['mp', 'mp'],
]

const ket = (szam: number) => String(szam).padStart(2, '0')

/**
 * A ket legnagyobb meg ertelmes egyseg, pl. "6 nap 4 óra", egy napon belul
 * "4 óra 24 perc". Masodperc nincs benne, igy nem rangatja a szemet.
 */
function rovidSzoveg(ertek: Bontas) {
  if (ertek.nap > 0) return `${ertek.nap} nap ${ertek.ora} óra`
  if (ertek.ora > 0) return `${ertek.ora} óra ${ertek.perc} perc`
  return `${ertek.perc} perc`
}

/**
 * Visszaszamlalo. Sajat allapotban ketyeg, ezert masodpercenkent csak ez
 * az egy komponens rajzolodik ujra, az oldal tobbi resze nem.
 *
 * Elorendereléskor meg nincs ido, ezert elso korben helyorzo jelenik meg,
 * es a bongeszo toltesekor all be az igazi ertek. Igy a hidratalas illeszkedik.
 */
function Visszaszamlalo({ cel, onLejart, onUtolsoNap, valtozat = 'blokkok' }: Props) {
  const [ertek, setErtek] = useState<Bontas | null>(null)

  useEffect(() => {
    let lejartSzolt = false
    let utolsoSzolt = false

    const frissit = () => {
      const maradek = cel - Date.now()
      setErtek(bontas(maradek))

      if (maradek <= UTOLSO_NAP && !utolsoSzolt) {
        utolsoSzolt = true
        onUtolsoNap?.()
      }
      if (maradek <= 0 && !lejartSzolt) {
        lejartSzolt = true
        onLejart?.()
      }
    }

    frissit()
    const ora = window.setInterval(frissit, 1000)
    return () => window.clearInterval(ora)
  }, [cel, onLejart, onUtolsoNap])

  if (valtozat === 'rovid') {
    return (
      <span className="mozi-ora-rovid" role="timer" aria-live="off">
        {ertek ? rovidSzoveg(ertek) : 'Hamarosan'}
      </span>
    )
  }

  if (valtozat === 'ora') {
    return (
      <span className="mozi-ora-digit" role="timer" aria-live="off">
        {ertek
          ? `${ket(ertek.nap)}:${ket(ertek.ora)}:${ket(ertek.perc)}:${ket(ertek.mp)}`
          : '--:--:--:--'}
      </span>
    )
  }

  return (
    <div className="mozi-ora" role="timer" aria-live="off">
      {CIMKEK.map(([kulcs, cimke]) => (
        <div key={kulcs} className="mozi-ora-elem">
          <span className="mozi-ora-szam">{ertek ? ket(ertek[kulcs]) : '--'}</span>
          <span className="mozi-ora-cimke">{cimke}</span>
        </div>
      ))}
    </div>
  )
}

export default memo(Visszaszamlalo)
