import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './App'
import './index.css'

const gyoker = document.getElementById('root')!
const elem = (
  <StrictMode>
    <App />
  </StrictMode>
)

// A kesz oldal mar elorenderelve erkezik, ezert hidratalunk. A fejlesztoi
// szerver viszont ures gyokerrel indul, ott nincs mit hidratalni.
if (gyoker.firstElementChild) {
  hydrateRoot(gyoker, elem)
} else {
  createRoot(gyoker).render(elem)
}
