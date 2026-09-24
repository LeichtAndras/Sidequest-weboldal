import { useState, type FormEvent } from 'react'
import { TALLY_EMAIL_MEZO, TALLY_VEGPONT } from '../site'
import { CheckIcon } from './Icons'

type Allapot = 'kezdo' | 'kuldes' | 'kesz'

/** Egyszeru formatum ellenorzes, nem szigoru szabvany. */
const ervenyesEmail = (ertek: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(ertek.trim())

/**
 * Szabalyos v4 azonosito. A crypto.randomUUID csak biztonsagos kapcsolaton
 * erheto el, ezert sima http-n, peldaul halozati teszteleskor, kezzel keszitjuk.
 * A Tally visszadobja a nem szabvanyos azonositot.
 */
function ujAzonosito() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  const bajtok = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bajtok)
  } else {
    for (let i = 0; i < bajtok.length; i++) bajtok[i] = Math.floor(Math.random() * 256)
  }

  bajtok[6] = (bajtok[6] & 0x0f) | 0x40
  bajtok[8] = (bajtok[8] & 0x3f) | 0x80

  const jegyek = [...bajtok].map((bajt) => bajt.toString(16).padStart(2, '0'))
  return [
    jegyek.slice(0, 4).join(''),
    jegyek.slice(4, 6).join(''),
    jegyek.slice(6, 8).join(''),
    jegyek.slice(8, 10).join(''),
    jegyek.slice(10, 16).join(''),
  ].join('-')
}

export default function Subscribe() {
  const [email, setEmail] = useState('')
  const [allapot, setAllapot] = useState<Allapot>('kezdo')
  const [hiba, setHiba] = useState<string | null>(null)

  async function bekuld(esemeny: FormEvent) {
    esemeny.preventDefault()
    if (allapot === 'kuldes') return

    if (!ervenyesEmail(email)) {
      setHiba('Ellenőrizd az email címet.')
      return
    }

    setHiba(null)
    setAllapot('kuldes')

    try {
      const valasz = await fetch(TALLY_VEGPONT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionUuid: ujAzonosito(),
          respondentUuid: ujAzonosito(),
          responses: { [TALLY_EMAIL_MEZO]: email.trim() },
          captchas: {},
          isCompleted: true,
          password: null,
        }),
      })

      if (!valasz.ok) throw new Error(`HTTP ${valasz.status}`)
      setAllapot('kesz')
    } catch {
      setAllapot('kezdo')
      setHiba('Most nem sikerült elküldeni. Próbáld újra.')
    }
  }

  return (
    <section
      className="mt-6 rounded-2xl border-2 border-dashed border-cream/25 bg-surface p-5 shadow-[0_12px_28px_rgba(0,0,0,0.45)]"
      style={{ transform: 'rotate(0.8deg)' }}
    >
      <h2 className="font-display text-[1.05rem] leading-tight text-cream">
        Ne maradj le az új helyekről
      </h2>
      <p className="mt-2 text-[0.95rem] leading-relaxed text-cream/70">
        Szólunk, amikor új kedvezmény érkezik.
      </p>

      {allapot === 'kesz' ? (
        <p
          role="status"
          className="mt-4 flex items-center gap-2 rounded-xl bg-accent/15 px-4 py-3 font-semibold text-accent"
        >
          <CheckIcon className="h-4 w-4 shrink-0" />
          Kész, szólunk majd.
        </p>
      ) : (
        <form onSubmit={bekuld} noValidate className="mt-4">
          <div className="flex gap-2">
            <label htmlFor="feliratkozas-email" className="sr-only">
              Email cím
            </label>
            <input
              id="feliratkozas-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="email@pelda.hu"
              value={email}
              onChange={(esemeny) => {
                setEmail(esemeny.target.value)
                if (hiba) setHiba(null)
              }}
              aria-invalid={hiba ? true : undefined}
              className="min-w-0 flex-1 rounded-xl border border-line bg-ink px-3.5 py-3 text-[0.95rem] text-cream placeholder:text-cream/40"
            />
            <button
              type="submit"
              disabled={allapot === 'kuldes'}
              className="shrink-0 rounded-[8px] border-2 border-cream/70 bg-accent px-4 py-3 font-display text-[0.8rem] text-ink transition active:scale-[0.97] disabled:opacity-60"
            >
              {allapot === 'kuldes' ? 'Küldés...' : 'Feliratkozom'}
            </button>
          </div>

          {hiba ? (
            <p role="alert" className="mt-2 text-[0.85rem] text-cream/70">
              {hiba}
            </p>
          ) : null}
        </form>
      )}
    </section>
  )
}
