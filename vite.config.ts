import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Az oldal a sidequestbp.hu gyokereben fut, ezert a base "/".
  // Ha valaha alkonyvtarbol szolgalnank ki, pl. felhasznalonev.github.io/sidequest/,
  // akkor ezt "/sidequest/"-re kell atirni.
  base: '/',
  plugins: [react(), tailwindcss()],
})
