import { memo, useState } from 'react'
import type { Partner } from '../types'
import CouponCode from './CouponCode'
import PartnerDetails from './PartnerDetails'
import { ChevronIcon, QrIcon, SpeechIcon, TagIcon } from './Icons'

type Props = {
  partner: Partner
  featured?: boolean
  open: boolean
  onToggle: () => void
}

function RedeemIcon({ partner }: { partner: Partner }) {
  const className = 'h-4 w-4 shrink-0 translate-y-0.5 text-accent'
  if (partner.code) return <TagIcon className={className} />
  if (partner.redeem.includes('QR')) return <QrIcon className={className} />
  return <SpeechIcon className={className} />
}

/** Fel es masfel fok kozotti doles, a slugbol, hogy mindig ugyanaz legyen. */
function dolesSzog(slug: string) {
  let osszeg = 0
  for (let i = 0; i < slug.length; i++) osszeg += slug.charCodeAt(i)
  const merteke = 0.5 + ((osszeg % 11) / 10)
  return osszeg % 2 === 0 ? merteke : -merteke
}

export function hasDetails(partner: Partner) {
  return Boolean(
    partner.description?.trim() ||
      partner.address?.trim() ||
      partner.conditions?.trim() ||
      partner.steps?.some((step) => step.trim() !== ''),
  )
}

function PartnerCard({ partner, featured = false, open, onToggle }: Props) {
  const [imageFailed, setImageFailed] = useState(false)
  const doles = dolesSzog(partner.slug)
  const value = partner.discount.replace(/[^\d.,]/g, '')
  const unit = partner.discount.replace(/[\d.,]/g, '')
  const expandable = hasDetails(partner)
  const panelId = `reszletek-${partner.name.replace(/\s+/g, '-').toLowerCase()}`

  const head = (
    <>
      {partner.image && !imageFailed ? (
        <div className="relative">
          <img
            src={partner.image}
            alt={partner.name}
            loading="lazy"
            onError={() => setImageFailed(true)}
            style={partner.imagePosition ? { objectPosition: partner.imagePosition } : undefined}
            className={`h-[140px] w-full object-cover ${
              partner.brightenImage ? 'brightness-[1.35] contrast-[1.15] saturate-[1.1]' : ''
            }`}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-b from-transparent to-surface" />
        </div>
      ) : null}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1.5">
            <h2 className="font-display text-[0.95rem] leading-tight text-cream">{partner.name}</h2>
            <span
              className="rounded-[5px] bg-accent px-2 py-0.5 text-[0.68rem] font-semibold text-ink shadow-[0_2px_4px_rgba(5,32,46,0.5)]"
              style={{ transform: 'rotate(-2.5deg)' }}
            >
              {partner.category}
            </span>
          </div>
          <p
            className="shrink-0 text-right font-display leading-none text-accent"
            style={{ textShadow: '0 0 16px rgba(54,185,240,0.45)' }}
          >
            <span className="text-[2.6rem]">{value}</span>
            <span className="text-[1.3rem]">{unit}</span>
          </p>
        </div>

        <div className="mt-3 flex items-start justify-between gap-2.5">
          <p className="flex items-start gap-2 text-[0.9rem] leading-snug text-cream/70">
            <RedeemIcon partner={partner} />
            <span>{partner.redeem}</span>
          </p>
          {expandable ? (
            <ChevronIcon
              className={`h-5 w-5 shrink-0 text-cream/70 transition-transform duration-200 ${
                open ? 'rotate-180' : ''
              }`}
            />
          ) : null}
        </div>
      </div>
    </>
  )

  return (
    <article
      id={`partner-${partner.slug}`}
      style={{ transform: `rotate(${doles}deg)` }}
      className={`scroll-mt-4 overflow-hidden rounded-2xl border-2 border-dashed bg-surface shadow-[0_12px_28px_rgba(0,0,0,0.45)] ${
        featured ? 'border-accent' : 'border-cream/25'
      }`}
    >
      {expandable ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="block w-full cursor-pointer text-left"
        >
          {head}
        </button>
      ) : (
        <div>{head}</div>
      )}

      {partner.code ? (
        <div className="px-4 pb-4">
          <CouponCode code={partner.code} />
        </div>
      ) : null}

      {expandable ? (
        <div
          id={panelId}
          inert={!open}
          className={`grid px-4 transition-all duration-200 ease-out ${
            open ? 'grid-rows-[1fr] pb-4 opacity-100' : 'grid-rows-[0fr] pb-0 opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <PartnerDetails partner={partner} />
          </div>
        </div>
      ) : null}
    </article>
  )
}

/** Csak akkor rajzoljuk ujra, ha ennek a kartyanak valtozott valamije. */
export default memo(PartnerCard)
