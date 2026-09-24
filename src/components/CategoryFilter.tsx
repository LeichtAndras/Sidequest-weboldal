type Props = {
  categories: string[]
  active: string
  onSelect: (category: string) => void
}

export const ALL = 'Összes'

export default function CategoryFilter({ categories, active, onSelect }: Props) {
  return (
    <div className="no-scrollbar -mx-5 flex gap-2.5 overflow-x-auto px-5 pt-1 pb-2">
      {[ALL, ...categories].map((category, index) => {
        const selected = category === active
        return (
          <button
            key={category}
            type="button"
            onClick={() => onSelect(category)}
            aria-pressed={selected}
            style={{ transform: `rotate(${index % 2 === 0 ? -1.6 : 1.4}deg)` }}
            className={`shrink-0 cursor-pointer rounded-[6px] border-2 px-3 py-1.5 font-display text-[0.78rem] shadow-[0_3px_6px_rgba(0,0,0,0.45)] transition ${
              selected
                ? 'border-cream bg-accent text-ink'
                : 'border-cream/30 bg-surface text-cream/75'
            }`}
          >
            {category}
          </button>
        )
      })}
    </div>
  )
}
