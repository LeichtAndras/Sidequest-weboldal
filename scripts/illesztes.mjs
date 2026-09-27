/**
 * Megkeresi, hol all a kivagas az eredeti fotóban. Tobb lepcsoben dolgozik:
 * eloszor kis meretben durvan, aztan egyre nagyobban finomitva. Igy nem kell
 * a teljes felbontason vegigprobalni minden pozíciót.
 */
import sharp from 'sharp'

/** Szurkearnyalatos kep es atlatszosag egy adott szelessegre kicsinyitve. */
async function szurke(be, szeles, atlatszosaggal = false) {
  const kep = sharp(be).resize({ width: szeles, kernel: 'cubic' })
  const { data, info } = await (atlatszosaggal ? kep.ensureAlpha() : kep.removeAlpha())
    .raw()
    .toBuffer({ resolveWithObject: true })

  const C = info.channels
  const szurkeSor = new Uint8Array(info.width * info.height)
  const alfa = atlatszosaggal ? new Uint8Array(info.width * info.height) : null

  for (let i = 0; i < info.width * info.height; i++) {
    szurkeSor[i] = (data[i * C] * 299 + data[i * C + 1] * 587 + data[i * C + 2] * 114) / 1000
    if (alfa) alfa[i] = data[i * C + 3]
  }

  return { szurke: szurkeSor, alfa, W: info.width, H: info.height }
}

/**
 * A legjobb eltolas egy adott meretben. Nem a nyers kulonbseget nezzuk, hanem
 * a mintazatok egyezeset: a ket reszlet sajat atlagahoz es szorasahoz merve.
 * Igy a fenyero es a kontraszt elterese nem zavar be, csak a rajzolat szamit.
 * A visszaadott hiba 0 es 2 kozott van, a nulla a tokeletes egyezes.
 */
function keres(hatter, kivagas, tolX, igX, tolY, igY, ritkitas) {
  let legjobb = { x: 0, y: 0, hiba: Infinity }

  for (let dy = tolY; dy <= igY; dy++) {
    for (let dx = tolX; dx <= igX; dx++) {
      let sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0, db = 0

      for (let y = 0; y < kivagas.H; y += ritkitas) {
        const hy = dy + y
        if (hy < 0 || hy >= hatter.H) continue
        for (let x = 0; x < kivagas.W; x += ritkitas) {
          const i = y * kivagas.W + x
          if (kivagas.alfa[i] < 200) continue
          const hx = dx + x
          if (hx < 0 || hx >= hatter.W) continue
          const a = kivagas.szurke[i]
          const b = hatter.szurke[hy * hatter.W + hx]
          sa += a; sb += b; saa += a * a; sbb += b * b; sab += a * b; db++
        }
      }

      if (db < 60) continue
      const szorasA = Math.sqrt(Math.max(1e-6, saa / db - (sa / db) ** 2))
      const szorasB = Math.sqrt(Math.max(1e-6, sbb / db - (sb / db) ** 2))
      const egyutthato = (sab / db - (sa / db) * (sb / db)) / (szorasA * szorasB)
      const hiba = 1 - egyutthato

      if (hiba < legjobb.hiba) legjobb = { x: dx, y: dy, hiba }
    }
  }

  return legjobb
}

/**
 * Hol all a kivagas a hatterben. Visszaadja az eltolast a hatter eredeti
 * keppontjaiban, a meretaranyt es az atlagos elterest (0-255).
 */
export async function hovaIllik(hatterFajl, kivagasFajl, aranyok = [1]) {
  const durva = 220

  // Ha a kivagas ugyanakkora, mint a hatter, akkor teljes kepkockas, nincs mit keresni
  if (aranyok.includes(1)) {
    const h = await sharp(hatterFajl).metadata()
    const k = await sharp(kivagasFajl).metadata()
    if (h.width === k.width && h.height === k.height) {
      return { x: 0, y: 0, arany: 1, hiba: 0,
        hatterMeret: { W: h.width, H: h.height }, kivagasMeret: { W: k.width, H: k.height } }
    }
  }
  const hatterMeret = await sharp(hatterFajl).metadata()
  const kivagasMeret = await sharp(kivagasFajl).metadata()

  const hatterDurva = await szurke(hatterFajl, durva)
  const skala = hatterDurva.W / hatterMeret.width

  let legjobb = { hiba: Infinity }
  for (const arany of aranyok) {
    const szeles = Math.max(8, Math.round(kivagasMeret.width * arany * skala))
    if (szeles > hatterDurva.W) continue
    const kivagasDurva = await szurke(kivagasFajl, szeles, true)
    const t = keres(
      hatterDurva,
      kivagasDurva,
      -8,
      hatterDurva.W - kivagasDurva.W + 8,
      -8,
      hatterDurva.H - kivagasDurva.H + 8,
      1,
    )
    if (t.hiba < legjobb.hiba) legjobb = { ...t, arany, szint: durva }
  }

  if (!Number.isFinite(legjobb.hiba)) return null

  // Finomitas: minden lepcsoben ketszeres meret, szuk kornyezetben
  let x = legjobb.x
  let y = legjobb.y
  let szint = durva

  for (const kovetkezo of [600, 1600]) {
    if (kovetkezo > hatterMeret.width) break
    const szorzo = kovetkezo / szint
    x = Math.round(x * szorzo)
    y = Math.round(y * szorzo)

    const h = await szurke(hatterFajl, kovetkezo)
    const kSzeles = Math.round((kivagasMeret.width * legjobb.arany * kovetkezo) / hatterMeret.width)
    if (kSzeles < 8 || kSzeles >= h.W) break
    const k = await szurke(kivagasFajl, kSzeles, true)

    const t = keres(h, k, x - 5, x + 5, y - 5, y + 5, 2)
    x = t.x
    y = t.y
    legjobb.hiba = t.hiba
    szint = kovetkezo
  }

  const vissza = hatterMeret.width / szint
  return {
    x: Math.round(x * vissza),
    y: Math.round(y * vissza),
    arany: legjobb.arany,
    hiba: +legjobb.hiba.toFixed(1),
    hatterMeret: { W: hatterMeret.width, H: hatterMeret.height },
    kivagasMeret: {
      W: Math.round(kivagasMeret.width * legjobb.arany),
      H: Math.round(kivagasMeret.height * legjobb.arany),
    },
  }
}
