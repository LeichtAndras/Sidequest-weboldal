/**
 * Gorgetes zarolasa nyitott ablak (modal) alatt, iOS Safarin is.
 *
 * Harom reteg, mert iPhone-on egyik sem eleg egyedul:
 *   1. a body-t rogzitjuk a mostani helyen (position: fixed, top: -scrollY),
 *      bezaraskor visszaallitjuk, es oda gorgetunk, ahol volt;
 *   2. a html-t is lezarjuk (overflow: hidden);
 *   3. az erintes-huzast (touchmove) mindenhol elnyeljuk, kiveve egy
 *      ablakon beluli elemben, ami tenyleg gorgetheto (tobb a tartalma, mint
 *      ami kifer). Igy a hatter semmikepp nem mozdul.
 *
 * Tobb ablak lehet egymason (pl. megerosites, utana a teljes kepernyo):
 * szamlaloval zarunk, es csak az utolso bezarasakor oldunk fel.
 */
let nyitottAblakok = 0
let mentettHely = 0
let regiBody: Partial<CSSStyleDeclaration> = {}
let regiHtml = ''

/** Van-e a celpont es az ablak kozott olyan elem, ami tenyleg gorgetheto. */
function gorgethetoOse(cel: EventTarget | null): boolean {
  let elem = cel instanceof Element ? cel : null
  while (elem && elem !== document.body) {
    const stilus = getComputedStyle(elem)
    if (/(auto|scroll)/.test(stilus.overflowY) && elem.scrollHeight > elem.clientHeight + 1) return true
    // Az ablak hatarat nem lepjuk at: azon kivul minden a hatter
    if (elem.classList.contains('fiok-retes') || elem.classList.contains('bev-kepernyo')) return false
    elem = elem.parentElement
  }
  return false
}

function erintesHuzas(e: TouchEvent) {
  if (!gorgethetoOse(e.target)) e.preventDefault()
}

export function gorgetesZarolasa(): () => void {
  if (typeof document === 'undefined') return () => {}

  if (nyitottAblakok === 0) {
    mentettHely = window.scrollY
    const s = document.body.style
    regiBody = { position: s.position, top: s.top, left: s.left, right: s.right, width: s.width, overflow: s.overflow }
    regiHtml = document.documentElement.style.overflow
    s.position = 'fixed'
    s.top = `-${mentettHely}px`
    s.left = '0'
    s.right = '0'
    s.width = '100%'
    s.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    document.addEventListener('touchmove', erintesHuzas, { passive: false })
  }
  nyitottAblakok++

  let feloldva = false
  return () => {
    if (feloldva) return
    feloldva = true
    nyitottAblakok--
    if (nyitottAblakok > 0) return
    document.removeEventListener('touchmove', erintesHuzas)
    Object.assign(document.body.style, regiBody)
    document.documentElement.style.overflow = regiHtml
    window.scrollTo(0, mentettHely)
  }
}
