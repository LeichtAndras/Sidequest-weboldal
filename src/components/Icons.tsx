type IconProps = { className?: string; style?: React.CSSProperties }

export function QrIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} style={style}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M14 14h3v3h-3zM18 18h3v3h-3zM18 14h3M14 18v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function SpeechIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} style={style}>
      <path
        d="M20 12.5c0 3.9-3.6 7-8 7-.9 0-1.8-.1-2.6-.4L4 21l1.4-3.6C4.2 16.1 3.5 14.4 3.5 12.5c0-3.9 3.6-7 8-7s8.5 3.1 8.5 7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function TagIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} style={style}>
      <path
        d="M4 11.2V5a1 1 0 0 1 1-1h6.2a2 2 0 0 1 1.4.6l7 7a2 2 0 0 1 0 2.8l-5.8 5.8a2 2 0 0 1-2.8 0l-7-7a2 2 0 0 1-.6-1.4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="8.2" cy="8.2" r="1.4" fill="currentColor" />
    </svg>
  )
}

export function CopyIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} style={style}>
      <rect x="9" y="9" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M15 5.5A1.5 1.5 0 0 0 13.5 4h-8A1.5 1.5 0 0 0 4 5.5v8A1.5 1.5 0 0 0 5.5 15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function CheckIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} style={style}>
      <path
        d="m5 12.5 4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function InstagramIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} style={style}>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" />
    </svg>
  )
}

export function TikTokIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} style={style}>
      <path
        d="M14.2 3v10.9a3.1 3.1 0 1 1-2.6-3.06"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.2 3.6c.5 2.4 2.2 3.9 4.6 4.1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ChevronIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} style={style}>
      <path
        d="m6 9.5 6 6 6-6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function MapPinIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} style={style}>
      <path
        d="M12 21s7-5.2 7-10.4A7 7 0 0 0 5 10.6C5 15.8 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10.4" r="2.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

export function InfoIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} style={style}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 11v5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="7.8" r="1.2" fill="currentColor" />
    </svg>
  )
}

export function ShareIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} style={style}>
      <path
        d="M12 15.5V4m0 0L8.2 7.8M12 4l3.8 3.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5v-6.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Kezzel rajzolt bekejel, a kozosseg jele. */
export function PeaceIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} style={style}>
      <path
        d="M12 2.6c-5 .3-8.6 4.4-8.4 9.6.2 5 4.2 9 9.1 8.8 5-.2 8.7-4.4 8.4-9.5-.3-4.9-4.2-8.7-9.1-8.9Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path d="M12 3.4c-.2 4.6-.1 9.2.1 17.4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M11.7 12.2c-1.5 2-3 3.9-4.9 5.9" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M12.3 12.1c1.4 2 2.9 4 4.6 5.9" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  )
}

/** Ujjlenyomat: egyertelmuen jelzi, hogy nyomva kell tartani. */
export function FingerprintIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} style={style}>
      <path d="M12 4.6c-3.2 0-5.9 2.5-5.9 5.7v2.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M17.9 10.3c0-3.2-2.6-5.7-5.9-5.7-1.1 0-2.1.3-3 .8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M9.2 10.3c0-1.5 1.3-2.7 2.8-2.7s2.8 1.2 2.8 2.7v3.3c0 1.9-.4 3.7-1.2 5.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M12 10.1v3.8c0 2.3-.6 4.6-1.8 6.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M6.1 15.4c0 1.8-.5 3.5-1.4 5M17.9 13.2c0 2.6-.6 5.1-1.8 7.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}
