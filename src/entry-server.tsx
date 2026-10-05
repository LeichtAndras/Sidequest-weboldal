import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import Oldal from './Oldal'

/**
 * Eloreneneles: a build utan ez adja a statikus HTML-t minden cimhez.
 * Ugyanazt a fat rajzolja, mint a bongeszo, igy a hidratalas illeszkedik.
 */
export function render(utvonal: string) {
  return renderToString(
    <StrictMode>
      <Oldal utvonal={utvonal} />
    </StrictMode>,
  )
}
