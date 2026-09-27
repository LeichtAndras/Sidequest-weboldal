type Props = {
  categories: string[]
  active: string
  onSelect: (category: string) => void
}

export const ALL = 'Összes'

/** Sotet kapszula gombok, az aktiv a logo kekjevel kitoltve. */
export default function CategoryFilter({ categories, active, onSelect }: Props) {
  return (
    <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 py-2">
      {[ALL, ...categories].map((category) => {
        const kivalasztva = category === active

        return (
          <button
            key={category}
            type="button"
            onClick={() => onSelect(category)}
            aria-pressed={kivalasztva}
            className={`shrink-0 cursor-pointer rounded-full px-4 py-2 text-[0.82rem] font-semibold whitespace-nowrap transition active:scale-[0.97] ${
              kivalasztva
                ? 'bg-accent text-ink'
                : 'border border-white/15 bg-[#0A0A0A]/80 text-cream'
            }`}
          >
            {category}
          </button>
        )
      })}
    </div>
  )
}
