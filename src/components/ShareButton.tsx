import { useEffect, useRef, useState } from 'react'
import type { Partner } from '../types'
import { partnerUrl } from '../site'
import { CheckIcon, ShareIcon } from './Icons'

type Props = { partner: Partner }

export default function ShareButton({ partner }: Props) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  function jelezMasolas() {
    setCopied(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 2000)
  }

  function vagolapra(url: string) {
    const mezo = document.createElement('textarea')
    mezo.value = url
    mezo.setAttribute('readonly', '')
    mezo.style.position = 'fixed'
    mezo.style.opacity = '0'
    document.body.appendChild(mezo)
    mezo.select()
    document.execCommand('copy')
    document.body.removeChild(mezo)
  }

  async function megoszt() {
    const url = partnerUrl(partner.slug)

    if (navigator.share) {
      try {
        await navigator.share({
          title: partner.name,
          text: `${partner.name}: ${partner.discount} kedvezmény SideQuest-tel`,
          url,
        })
        return
      } catch (hiba) {
        // A felhasznalo megszakitotta a megosztast, ilyenkor nincs tovabbi teendo.
        if (hiba instanceof Error && hiba.name === 'AbortError') return
      }
    }

    try {
      await navigator.clipboard.writeText(url)
    } catch {
      vagolapra(url)
    }
    jelezMasolas()
  }

  return (
    <button
      type="button"
      onClick={megoszt}
      aria-live="polite"
      className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-accent/60 px-4 py-3 font-semibold text-accent transition active:scale-[0.98]"
    >
      {copied ? <CheckIcon className="h-4 w-4" /> : <ShareIcon className="h-4 w-4" />}
      {copied ? 'Link másolva' : 'Megosztás'}
    </button>
  )
}
