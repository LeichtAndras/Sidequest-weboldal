import { useEffect, useRef, useState } from 'react'
import { CheckIcon, CopyIcon } from './Icons'

type Props = { code: string }

export default function CouponCode({ code }: Props) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      const field = document.createElement('textarea')
      field.value = code
      field.setAttribute('readonly', '')
      field.style.position = 'fixed'
      field.style.opacity = '0'
      document.body.appendChild(field)
      field.select()
      document.execCommand('copy')
      document.body.removeChild(field)
    }
    setCopied(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2">
      <code
        className="flex-1 rounded-xl border border-dashed border-accent/50 bg-accent/10 px-3 py-2.5 text-center font-display text-[0.9rem] tracking-[0.1em] text-accent"
      >
        {code}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-live="polite"
        className="flex shrink-0 items-center gap-1.5 rounded-xl bg-accent px-3.5 py-2.5 text-sm font-semibold text-ink transition active:scale-[0.97]"
      >
        {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
        {copied ? 'Kimásolva' : 'Másolás'}
      </button>
    </div>
  )
}
