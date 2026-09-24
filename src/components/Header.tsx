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
    <header className="fal relative overflow-hidden pt-5 pb-16">
      <div className="relative mx-auto w-full max-w-[480px] px-4">
        {/* Fotokollazs */}
        <div className="relative h-[300px]" aria-hidden="true">
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

        <p className="relative z-10 mt-5 text-center font-display text-[1.05rem] leading-tight text-ink">
          Budapest legjobb helyei, olcsóbban.
        </p>
      </div>

      {/* Szakadt papir el, innen indul a sotet resz */}
      <svg
        className="absolute inset-x-0 bottom-0 h-[46px] w-full"
        viewBox="0 0 1200 60"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path fill="#05202E" opacity="0.4" d="M0 60V48L38 36L88 47L123 49L170 46L219 42L266 39L304 38L346 42L378 43L432 39L461 36L492 39L525 41L558 48L601 36L646 55L673 48L703 38L743 39L795 43L824 45L863 35L921 40L951 37L1008 49L1037 56L1073 42L1101 43L1134 41L1185 49L1200 56V60Z" />
        <path fill="#05202E" d="M0 60V28L20 35L44 21L68 35L83 33L98 27L128 37L157 24L189 30L211 24L227 38L257 35L272 26L290 29L313 22L339 26L366 24L381 31L400 36L424 31L439 33L454 33L476 38L501 35L530 38L550 29L565 37L594 38L615 22L631 33L652 23L681 35L695 46L728 31L755 29L780 29L799 51L824 30L844 33L874 22L903 33L921 29L943 44L957 36L978 21L996 23L1016 23L1040 26L1072 46L1100 39L1123 38L1154 31L1171 24L1200 39V60Z" />
      </svg>

    </header>
  )
}
