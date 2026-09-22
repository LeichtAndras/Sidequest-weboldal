type Props = {
  categories: string[]
  active: string
  onSelect: (category: string) => void
}

export const ALL = 'Összes'

export default function CategoryFilter({ categories, active, onSelect }: Props) {
  return (
    <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
      {[ALL, ...categories].map((category) => {
        const selected = category === active
        return (
          <button
            key={category}
            type="button"
            onClick={() => onSelect(category)}
            aria-pressed={selected}
            className={`shrink-0 cursor-pointer rounded-full border px-3.5 py-1.5 text-[0.85rem] font-medium transition ${
              selected
                ? 'border-accent bg-accent text-ink'
                : 'border-line bg-surface text-cream/70'
            }`}
          >
            {category}
          </button>
        )
      })}
    </div>
  )
}
