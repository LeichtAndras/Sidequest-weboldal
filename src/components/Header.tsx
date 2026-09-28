type Fotó = {
  src: string
  bal: string
  teto: string
  szeles: string
  dolt: number
  reteg: number
  szalagDolt: number
}

/** Kiragasztott fotok a falon. Szandekosan szabalytalan elrendezes. */
const fotok: Fotó[] = [
  { src: '/images/fal/szelfimuzeum.jpg', bal: '1%', teto: '6px', szeles: '33%', dolt: -7, reteg: 1, szalagDolt: -12 },
  { src: '/images/fal/sugar-bowling.jpg', bal: '30%', teto: '0px', szeles: '34%', dolt: 4, reteg: 2, szalagDolt: 8 },
  { src: '/images/fal/timeheist.jpg', bal: '63%', teto: '14px', szeles: '32%', dolt: -5, reteg: 1, szalagDolt: 14 },
  { src: '/images/fal/baltadobalas.jpg', bal: '4%', teto: '128px', szeles: '31%', dolt: 6, reteg: 2, szalagDolt: -8 },
  { src: '/images/fal/leonoria.jpg', bal: '36%', teto: '150px', szeles: '30%', dolt: -4, reteg: 1, szalagDolt: 10 },
  { src: '/images/fal/basebar.jpg', bal: '66%', teto: '136px', szeles: '30%', dolt: 8, reteg: 2, szalagDolt: -14 },
]

export default function Header() {
  return (
    <header className="hero pt-5">
      <div className="hero-fatyol" />
      <div className="hero-doboz relative mx-auto w-full max-w-[480px] px-4">
        {/* Fotokollazs */}
        <div className="hero-kollazs relative" aria-hidden="true">
          {fotok.map((foto) => (
            <div
              key={foto.src}
              className="absolute"
              style={{
                left: foto.bal,
                top: foto.teto,
                width: foto.szeles,
                zIndex: foto.reteg,
                transform: `rotate(${foto.dolt}deg)`,
              }}
            >
              <div className="relative bg-cream p-1.5 shadow-[0_6px_14px_rgba(5,32,46,0.35)]">
                <img
                  src={foto.src}
                  alt=""
                  loading="eager"
                  className="aspect-[3/4] w-full object-cover"
                />
                <span
                  className="szalag"
                  style={{
                    left: '50%',
                    top: '-10px',
                    transform: `translateX(-50%) rotate(${foto.szalagDolt}deg)`,
                  }}
                />
              </div>
            </div>
          ))}

          {/* A logo a kollazs elott */}
          <img
            src="/sidequest-logo-atlatszo.png"
            alt="SideQuest"
            width={230}
            height={199}
            fetchPriority="high"
            className="absolute top-1/2 left-1/2 z-10 h-auto w-[230px] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_10px_18px_rgba(5,32,46,0.45)]"
          />
        </div>

        <p className="hero-szlogen relative z-10 mt-7 text-center text-[1.05rem] leading-tight text-ink"
          style={{ fontFamily: 'var(--font-hero)' }}>
          Budapest legjobb helyei, olcsóbban.
        </p>
      </div>

    </header>
  )
}
