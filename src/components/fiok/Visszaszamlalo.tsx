const ket = (n: number) => String(n).padStart(2, '0')

/**
 * Visszaszamlalo a mozi szavazas negy krem matricajaval (nap, ora, perc,
 * masodperc). A "most" a szerver idejehez igazitott ido, nem a telefone.
 */
export default function Visszaszamlalo({ cel, most, felirat }: { cel: number; most: number; felirat?: string }) {
  const mp = Math.max(0, Math.floor((cel - most) / 1000))
  const elemek: [string, string][] = [
    [String(Math.floor(mp / 86400)), 'nap'],
    [ket(Math.floor((mp % 86400) / 3600)), 'óra'],
    [ket(Math.floor((mp % 3600) / 60)), 'perc'],
    [ket(mp % 60), 'mp'],
  ]

  return (
    <div className="mozi-ora-blokk">
      {felirat ? <p className="mozi-ora-felirat">{felirat}</p> : null}
      <div className="mozi-ora" role="timer" aria-live="off">
        {elemek.map(([szam, cimke]) => (
          <span key={cimke} className="mozi-ora-elem">
            <span className="mozi-ora-szam">{szam}</span>
            <span className="mozi-ora-cimke">{cimke}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
