/**
 * Kartya kepek elokeszitese.  Futtatas:  npm run kepek
 *
 * 1. Hatter: a fotóbol 4:3 ablak, WebP-ben, ket meretben.
 * 2. Kivagas: feher matricaszegely beleegetve, WebP-ben.
 * 3. Ahol a kivagas ugyanabbol a fotóbol van, oda is kerul, ahol az eredetin
 *    all. Ilyenkor a helyet a szkript szamolja ki, es a src/data/cutouts.json
 *    fajlba irja, amit a kartya beolvas.
 *
 * Forras: kepek-eredeti/<slug>.jpg es kepek-eredeti/kivagasok/<slug>.png
 */
import sharp from 'sharp'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const GYOKER = fileURLToPath(new URL('..', import.meta.url))
const partnerek = JSON.parse(await readFile(`${GYOKER}src/data/partners.json`, 'utf8'))

const FEHER = { r: 255, g: 255, b: 255 }
const SOTETKEK = { r: 11, g: 27, b: 58 }

/** A korvonalak vastagsaga a kivagas szelessegenek aranyaban. */
const FEHER_ARANY = 0.024
const KEK_ARANY = 0.01
/** A kivagas kimeneti szelessege keppontban, ennel nagyobbra nem nagyitunk. */
const KIVAGAS_SZELES = 900

/**
 * Kartyankenti beallitas. Az "illeszt" az a pont a fotón, ahol a kivagas bal
 * felso sarka all; ezt a scripts/illesztes.mjs kereste meg. Ahol nincs, ott a
 * kivagas szabadon, bal alulra kerul.
 */
const KARTYAK = {
  // A golyo a kezeben van, tehat a kivagas resze. Jobbra nyujtva, hogy
  // a palyabol es a babukbol tobb latsszon.
  'sugar-bowling': {
    hatter: 'sugar-bowling2.jpg', illeszt: { x: 0, y: 0 }, kiterjesztJobbra: 500,
    hatterAblak: { x: 0, y: 480, w: 2036, h: 1527 }, elmosas: 2, diszValtozat: 2,
  },

  // Neon celtablak es grafiti. Hattal all, nincs arc. A jelenet balra tolva,
  // hogy a robbanas a falra essen, ne a karjara.
  'baltadobalas': {
    hatter: 'baltadobalas-uj.jpg', illeszt: { x: 0, y: 0 }, kiterjesztJobbra: 1600, kiterjesztFelul: 420,
    hatterAblak: { x: 250, y: 0, w: 3500, h: 2625 }, elmosas: 2, telitettseg: 1.35,
  },

  // Dzsungelfal es majomszobor. A jelenet lejjebb es balra, hogy a cim
  // se a majmot, se a fejeket ne takarja.
  'magic-rooms': {
    hatter: 'magic-rooms-uj.jpg', illeszt: { x: 0, y: 0 }, kiterjesztJobbra: 1100,
    hatterAblak: { x: 150, y: 0, w: 3300, h: 2475 }, elmosas: 2, telitettseg: 1.15,
  },

  // A harom alak fejtol terdig, mogottuk a pult es a kijelzok. Ez jo, marad.
  'sugarmozi': {
    hatter: 'sugarmozi-uj.jpg', illeszt: { x: 0, y: 0 }, kiterjesztJobbra: 1000,
    hatterAblak: { x: 0, y: 50, w: 3400, h: 2550 }, elmosas: 2, telitettseg: 1.15,
  },

  // A bicepszet mutato srac, fejtol derekig. A kartya also szele vagja el,
  // ezert nincs egyenes vagas es nincs feher korvonal az aljan.
  'leonoria-kvizbox': {
    hatter: 'leonoria-kvizbox-v2.jpg', illeszt: { x: 0, y: 0 }, kiterjesztJobbra: 450,
    hatterAblak: { x: 370, y: 130, w: 1600, h: 1200 }, elmosas: 2,
    telitettseg: 1.2, fenyero: 1.12, elesites: 1,
  },

  // Flamingofal, az arca a bal oldalon. A fotó maga 4:3, nem kell nyujtani.
  'szelfimuzeum': {
    hatter: 'szelfimuzeum.jpg', illeszt: { x: 0, y: 0 },
    hatterAblak: { x: 0, y: 0, w: 2048, h: 1536 }, elmosas: 2, telitettseg: 1.1,
  },

  // Uj, fekvo fotó. Csak a bal oldali srac van kivagva, a hatul setalo
  // a hatter resze marad. Vilagositva, hogy ne legyen tul sotet.
  'pixity': {
    // A srac es a hattérfal is majdnem fekete, a leemeles mindig beleveszi
    // a falat is. Amig nincs tiszta kivagas, a teljes fotó a hatter, elesen.
    hatter: 'pixity-v2.jpg', kivagasNelkul: true,
    hatterAblak: { x: 151, y: 0, w: 867, h: 650 }, elmosas: 0,
    telitettseg: 1.2, fenyero: 1.7, kontraszt: 1.1, simitas: 1.1, elesites: 1.2,
    matricaJobbra: true,
  },

  // Uj fotó. A jobb szelen levo telefonos kez es a jobb also sarok
  // elozetesen levagva, utana nyujtva, hogy a srac balra kerulon.
  'base-bar': {
    hatter: 'base-bar-v2.jpg', illeszt: { x: 0, y: 0 }, kiterjesztJobbra: 400,
    elozetesVagas: { left: 0, top: 0, width: 1330, height: 1900 },
    hatterAblak: { x: 100, y: 200, w: 1606, h: 1204 }, elmosas: 2,
    telitettseg: 1.12, fenyero: 1.12, elesites: 1,
  },

  // A tabla es a fal, a tukorben allo ketto nelkul
  'timeheist': {
    hatter: 'timeheist.jpg', szabadSzeles: 55, elmosas: 2,
    hatterAblak: { x: 192, y: 960, w: 1152, h: 864 }, telitettseg: 1.25, fenyero: 1.25, kontraszt: 1.15,
  },
}

/** Igazitott kepnel eleg az enyhe elmosas, kulonben ketszer latszana az alak. */
const ELMOSAS_IGAZITOTT = 4
const ELMOSAS_SZABAD = 12

/* ------------------------------------------------------------------ */

/** Tavolsag a legkozelebbi atlatszatlan keppontig, chamfer 3-4 kozelitessel. */
function tavolsagAlakzattol(kepPont, W, H) {
  const VEGTELEN = 1 << 28
  const tav = new Int32Array(W * H)
  for (let i = 0; i < W * H; i++) tav[i] = kepPont[i * 4 + 3] > 128 ? 0 : VEGTELEN

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      let d = tav[i]
      if (y > 0) {
        if (x > 0) d = Math.min(d, tav[i - W - 1] + 4)
        d = Math.min(d, tav[i - W] + 3)
        if (x < W - 1) d = Math.min(d, tav[i - W + 1] + 4)
      }
      if (x > 0) d = Math.min(d, tav[i - 1] + 3)
      tav[i] = d
    }
  }
  for (let y = H - 1; y >= 0; y--) {
    for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x
      let d = tav[i]
      if (y < H - 1) {
        if (x < W - 1) d = Math.min(d, tav[i + W + 1] + 4)
        d = Math.min(d, tav[i + W] + 3)
        if (x > 0) d = Math.min(d, tav[i + W - 1] + 4)
      }
      if (x < W - 1) d = Math.min(d, tav[i + 1] + 3)
      tav[i] = d
    }
  }
  return tav
}

/** Tavolsag a legkozelebbi atlatszo keppontig, ugyanazzal a kozelitessel. */
function tavolsagKintrol(alfa, W, H) {
  const VEGTELEN = 1 << 28
  const tav = new Int32Array(W * H)
  for (let i = 0; i < W * H; i++) tav[i] = alfa[i] <= 128 ? 0 : VEGTELEN

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      let d = tav[i]
      if (y > 0) {
        if (x > 0) d = Math.min(d, tav[i - W - 1] + 4)
        d = Math.min(d, tav[i - W] + 3)
        if (x < W - 1) d = Math.min(d, tav[i - W + 1] + 4)
      } else d = 0
      if (x > 0) d = Math.min(d, tav[i - 1] + 3)
      else d = 0
      tav[i] = d
    }
  }
  for (let y = H - 1; y >= 0; y--) {
    for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x
      let d = tav[i]
      if (y < H - 1) {
        if (x < W - 1) d = Math.min(d, tav[i + W + 1] + 4)
        d = Math.min(d, tav[i + W] + 3)
        if (x > 0) d = Math.min(d, tav[i + W - 1] + 4)
      } else d = 0
      if (x < W - 1) d = Math.min(d, tav[i + 1] + 3)
      else d = 0
      tav[i] = d
    }
  }
  return tav
}

/**
 * Vekony nyakkal lógó darabok levagasa. Eloszor osszehuzzuk az alakot, igy a
 * keskeny osszekottetesek elszakadnak, megtartjuk a legnagyobb reszt, majd
 * visszanovesztjuk. A szelei igy nem valtoznak, csak a fuggelekek tunnek el.
 */
function nyakatVag(kepPont, W, H, sugar) {
  const alfa = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) alfa[i] = kepPont[i * 4 + 3]

  const kintrol = tavolsagKintrol(alfa, W, H)
  const mag = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) mag[i] = kintrol[i] / 3 > sugar ? 255 : 0

  // A magbol csak a legnagyobb osszefuggo resz marad
  const seged = Buffer.alloc(W * H * 4)
  for (let i = 0; i < W * H; i++) seged[i * 4 + 3] = mag[i]
  egyFoltra(seged, W, H)

  // Visszanovesztes ugyanannyival, majd metszet az eredetivel
  const vissza = tavolsagAlakzattol(seged, W, H)
  for (let i = 0; i < W * H; i++) {
    if (vissza[i] / 3 > sugar) kepPont[i * 4 + 3] = 0
  }
}

/**
 * Csak a legnagyobb osszefuggo folt marad. Az apro, kulonallo darabok,
 * peldaul egy fenyfolt a kez mellett, igy nem kapnak feher szegelyt.
 */
function egyFoltra(kepPont, W, H) {
  const cimke = new Int32Array(W * H).fill(-1)
  const sor = new Int32Array(W * H)
  let legjobb = -1
  let legjobbMeret = 0

  for (let start = 0; start < W * H; start++) {
    if (cimke[start] !== -1 || kepPont[start * 4 + 3] <= 128) continue
    let eleje = 0, vege = 0, meret = 0
    sor[vege++] = start
    cimke[start] = start
    while (eleje < vege) {
      const i = sor[eleje++]
      meret++
      const x = i % W
      const y = (i / W) | 0
      const szomszedok = [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]
      for (const j of szomszedok) {
        if (j >= 0 && cimke[j] === -1 && kepPont[j * 4 + 3] > 128) { cimke[j] = start; sor[vege++] = j }
      }
    }
    if (meret > legjobbMeret) { legjobbMeret = meret; legjobb = start }
  }

  for (let i = 0; i < W * H; i++) if (cimke[i] !== legjobb) kepPont[i * 4 + 3] = 0
}

/** Az atlatszatlan resz hatarai. */
function hatarok(kepPont, W, H) {
  let bal = W, jobb = -1, fel = H, le = -1
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (kepPont[(y * W + x) * 4 + 3] > 32) {
        if (x < bal) bal = x
        if (x > jobb) jobb = x
        if (y < fel) fel = y
        if (y > le) le = y
      }
    }
  }
  return { bal, jobb, fel, le }
}

/**
 * Csak a fo alak marad: oszloponkent megnezzuk, mennyi atlatszatlan keppont
 * van, es a legsurubb resz kore huzunk hatart. Igy a mellette allo targyak,
 * peldaul egy plussflamingo, lemaradnak.
 */
function foAlakra(kepPont, W, H) {
  const oszlop = new Int32Array(W)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (kepPont[(y * W + x) * 4 + 3] > 128) oszlop[x]++

  let csucs = 0
  for (let x = 1; x < W; x++) if (oszlop[x] > oszlop[csucs]) csucs = x
  const kuszob = oszlop[csucs] * 0.3

  let bal = csucs, jobb = csucs
  while (bal > 0 && oszlop[bal - 1] >= kuszob) bal--
  while (jobb < W - 1 && oszlop[jobb + 1] >= kuszob) jobb++

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (x < bal || x > jobb) kepPont[(y * W + x) * 4 + 3] = 0
    }
  }
  return { bal, jobb }
}

/**
 * Az egyenetlen alj levagasa: alulrol felfele megyunk, amig a sziluett
 * szelessege meg no. Ott kezdodik az egybefuggo test, ott vagunk.
 */
function egyenesAlj(kepPont, W, H) {
  const sorSzeles = new Int32Array(H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (kepPont[(y * W + x) * 4 + 3] > 32) sorSzeles[y]++

  const h = hatarok(kepPont, W, H)
  let alsoMax = 0
  for (let y = Math.floor(H * 0.4); y < H; y++) if (sorSzeles[y] > alsoMax) alsoMax = sorSzeles[y]
  const lepes = Math.max(1, Math.round(H * 0.01))

  for (let y = h.le; y - lepes >= h.fel; y -= lepes) {
    if (sorSzeles[y] >= sorSzeles[y - lepes] * 0.98 && sorSzeles[y] >= alsoMax * 0.4) return y
  }
  return h.le
}

/** Matricaszegely: vastag feher, azon kivul vekony sotetkek. */
function szegelyt(kepPont, W, H, feherPx, kekPx) {
  const tav = tavolsagAlakzattol(kepPont, W, H)
  const ki = Buffer.alloc(W * H * 4)

  for (let i = 0; i < W * H; i++) {
    const t = tav[i] / 3
    let ar = 0, ag = 0, ab = 0, aa = 0
    if (t <= feherPx + kekPx) { ar = SOTETKEK.r; ag = SOTETKEK.g; ab = SOTETKEK.b; aa = 255 }
    if (t <= feherPx) { ar = FEHER.r; ag = FEHER.g; ab = FEHER.b; aa = 255 }

    const a = kepPont[i * 4 + 3] / 255
    ki[i * 4] = Math.round(kepPont[i * 4] * a + ar * (1 - a))
    ki[i * 4 + 1] = Math.round(kepPont[i * 4 + 1] * a + ag * (1 - a))
    ki[i * 4 + 2] = Math.round(kepPont[i * 4 + 2] * a + ab * (1 - a))
    ki[i * 4 + 3] = Math.round(255 * a + aa * (1 - a))
  }
  return ki
}

/** 4:3 hatter ket meretben. */
async function hatterKep(slug, forras, ablak, tukroz = false, be = {}) {
  const sorok = []
  for (const szeles of [640, 1200]) {
    const magas = Math.round((szeles * 3) / 4)
    const kivagott = sharp(forras)
      .extract({ left: ablak.x, top: ablak.y, width: ablak.w, height: ablak.h })
      .flop(tukroz)
      .resize({ width: szeles, height: magas, fit: 'fill' })

    let kep = kivagott
    if (be.telitettseg || be.fenyero) kep = kep.modulate({ saturation: be.telitettseg ?? 1, brightness: be.fenyero ?? 1 })
    if (be.kontraszt) kep = kep.linear(be.kontraszt, -(128 * (be.kontraszt - 1)))
    // Sotet fotón a vilagositas elohozza a tomoritesi kockakat, ezert eloszor
    // finoman elsimitjuk, utana visszaelesitjuk a kontúrokat.
    if (be.simitas) kep = kep.blur(be.simitas)
    if (be.elesites) kep = kep.sharpen({ sigma: be.elesites })
    if (be.beleegetettElmosas) {
      // Az elmosas a kepbe kerul, de a megadott folt eles marad, hogy
      // a lenyeges reszlet, peldaul a golyo, felismerheto legyen.
      const eles = await kivagott.clone().removeAlpha().raw().toBuffer()
      const homalyos = await kivagott
        .clone()
        .blur((be.beleegetettElmosas * szeles) / 1200)
        .removeAlpha()
        .raw()
        .toBuffer()

      const arany = szeles / ablak.w
      const kx = (be.elesFolt.x - ablak.x) * arany
      const cx = tukroz ? szeles - kx : kx
      const cy = (be.elesFolt.y - ablak.y) * arany
      const r = be.elesFolt.r * arany
      const kesz = Buffer.alloc(szeles * magas * 3)

      for (let y = 0; y < magas; y++) {
        for (let x = 0; x < szeles; x++) {
          const t = Math.hypot(x - cx, y - cy)
          // Lagy atmenet a folt szelen, hogy ne legyen lathato hatara
          const w = t <= r * 0.6 ? 1 : t >= r ? 0 : (r - t) / (r * 0.4)
          const i = (y * szeles + x) * 3
          for (let c = 0; c < 3; c++) kesz[i + c] = Math.round(eles[i + c] * w + homalyos[i + c] * (1 - w))
        }
      }
      kep = sharp(kesz, { raw: { width: szeles, height: magas, channels: 3 } })
    }

    const info = await kep
      .webp({ quality: 78, effort: 5 })
      .toFile(`${GYOKER}public/images/cards/${slug}-${szeles}.webp`)
    sorok.push(`${info.width}x${info.height} ${(info.size / 1024).toFixed(0)}kB`)
  }
  return sorok.join('  |  ')
}

/* ------------------------------------------------------------------ */

await mkdir(`${GYOKER}public/images/cards`, { recursive: true })
await mkdir(`${GYOKER}public/images/cutouts`, { recursive: true })

const helyek = {}
const jelentes = []

for (const partner of partnerek) {
  const be = KARTYAK[partner.slug]
  if (!be) continue

  const hatterFajl = `${GYOKER}kepek-eredeti/${be.hatter}`
  const kivagasFajl = `${GYOKER}kepek-eredeti/kivagasok/${partner.slug}.png`
  if (!existsSync(hatterFajl)) { jelentes.push([partner.slug, 'nincs hatter fotó']); continue }

  // Ha a fotó tul szuk, jobbra kiterjesztjuk: ott a robbanas es a gomb van,
  // tehat nem kell reszlet, cserebe az egesz jelenet balra tolhato.
  const nyujt = be.kiterjesztJobbra ?? 0
  const nyujtFel = be.kiterjesztFelul ?? 0
  let hatterMunka = hatterFajl
  if (nyujt > 0 || nyujtFel > 0 || be.elozetesVagas) {
    hatterMunka = `${GYOKER}kepek-eredeti/.munka-${partner.slug}.jpg`
    let m = sharp(hatterFajl)
    if (be.elozetesVagas) m = m.extract(be.elozetesVagas)
    await m.extend({ right: nyujt, top: nyujtFel, extendWith: 'copy' }).jpeg({ quality: 95 }).toFile(hatterMunka)
  }

  const hMeta = await sharp(hatterMunka).metadata()
  const W = hMeta.width, H = hMeta.height

  // A 4:3 ablak a lehetó legnagyobb, ha kell, balrol szukitve
  const vagBal = be.ablakVagBalrol ?? 0
  const aw = Math.min(W - vagBal, Math.round(H / 0.75))
  const ah = Math.round(aw * 0.75)

  let ablak = be.hatterAblak
    ? { ...be.hatterAblak }
    : { x: Math.round((W - aw) / 2), y: Math.round((H - ah) / 2), w: aw, h: ah }
  let hely = null
  let sor = ''

  if (be.kivagasNelkul) {
    hely = { szeles: 0, bal: 0, teto: null }
    sor = 'nincs kivagas, csak a hatter'
  } else if (existsSync(kivagasFajl) && be.illeszt) {
    // --- Igazitott kivagas: oda kerul, ahol az eredeti fotón all ---
    let kForras = kivagasFajl
    if (nyujt > 0 || nyujtFel > 0 || be.elozetesVagas) {
      let m = sharp(kivagasFajl).ensureAlpha()
      if (be.elozetesVagas) m = m.extract(be.elozetesVagas)
      kForras = await m
        .extend({ right: nyujt, top: nyujtFel, background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer()
    }
    const k = await sharp(kForras).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const kW = k.info.width, kH = k.info.height
    if (be.foAlakra) foAlakra(k.data, kW, kH)
    if (be.egyFolt) egyFoltra(k.data, kW, kH)
    if (be.nyakVagas) nyakatVag(k.data, kW, kH, be.nyakVagas)
    // Adott sor alatt nincs kivagas: pl. ami az elotérben allo konzol moge esik
    if (be.alsoVagas) {
      const hatar = be.alsoVagas + (nyujtFel ?? 0) - (be.elozetesVagas?.top ?? 0)
      for (let y = Math.max(0, hatar); y < kH; y++) for (let x = 0; x < kW; x++) k.data[(y * kW + x) * 4 + 3] = 0
    }
    const h = hatarok(k.data, kW, kH)

    // Az alak helye a fotón
    const alakBal = be.illeszt.x + h.bal
    const alakJobb = be.illeszt.x + h.jobb
    const alakFel = be.illeszt.y + h.fel
    const alakLe = be.illeszt.y + h.le

    // Kezi ablak eseten nem szamolunk, a beallitas donti el a jelenet helyet
    if (!be.hatterAblak) {
      ablak.x = Math.max(vagBal, Math.min(W - aw, Math.round(alakBal - aw * 0.03) + vagBal))
      ablak.y = Math.max(0, Math.min(H - ah, alakLe + (be.aljTartalek ?? 40) - ah))
    }

    // A kivagasbol csak az ablakba eso resz kell
    const metszBal = be.teljesAlak ? alakBal : Math.max(alakBal, ablak.x)
    const metszJobb = be.teljesAlak ? alakJobb : Math.min(alakJobb, ablak.x + ablak.w - 1)
    const metszFel = be.teljesAlak ? alakFel : Math.max(alakFel, ablak.y)
    const metszLe = be.teljesAlak ? alakLe : Math.min(alakLe, ablak.y + ablak.h - 1)
    if (metszJobb <= metszBal || metszLe <= metszFel) { jelentes.push([partner.slug, 'az alak kiesik az ablakbol']); continue }

    const kivagasBal = metszBal - be.illeszt.x
    const vagFel = metszFel - be.illeszt.y
    const vagSzeles = metszJobb - metszBal + 1
    const vagMagas = metszLe - metszFel + 1

    let darab = await sharp(k.data, { raw: { width: kW, height: kH, channels: 4 } })
      .extract({ left: kivagasBal, top: vagFel, width: vagSzeles, height: vagMagas })
      .png()
      .toBuffer()

    // Zold csempek a labak ala, elesen, hogy a feny is latsszon
    if (be.zoldCsempek) {
      darab = await zoldCsempekHozza(darab, vagSzeles, vagMagas, hatterFajl, metszBal, metszFel)
    }

    // Kimeneti meret es szegely
    const cel = Math.min(KIVAGAS_SZELES, vagSzeles)
    const atmeretezett = await sharp(darab).resize({ width: cel }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const oW = atmeretezett.info.width, oH = atmeretezett.info.height
    const feherPx = Math.max(2, Math.round(oW * FEHER_ARANY))
    const kekPx = Math.max(1, Math.round(oW * KEK_ARANY))
    const parna = feherPx + kekPx + 4

    // Csak arra az oldalra teszunk parnat, amit nem az ablak vagott le
    const parnaBal = metszBal > alakBal ? 0 : parna
    const parnaJobb = metszJobb < alakJobb ? 0 : parna
    const parnaFel = metszFel > alakFel ? 0 : parna
    const parnaLe = metszLe < alakLe ? 0 : parna

    const parnazott = await sharp(atmeretezett.data, { raw: { width: oW, height: oH, channels: 4 } })
      .extend({ top: parnaFel, bottom: parnaLe, left: parnaBal, right: parnaJobb, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .raw()
      .toBuffer({ resolveWithObject: true })

    const pW = parnazott.info.width, pH = parnazott.info.height
    const kesz = szegelyt(parnazott.data, pW, pH, feherPx, kekPx)
    const info = await sharp(kesz, { raw: { width: pW, height: pH, channels: 4 } })
      .flop(Boolean(be.tukroz))
      .webp({ quality: 88, alphaQuality: 100, effort: 5 })
      .toFile(`${GYOKER}public/images/cutouts/${partner.slug}.webp`)

    // Hely a kartyan, a kartya szelessegenek szazalekaban
    if (be.teljesMagassag) {
      // Kicsinyitve, hogy a teljes alak befer a kartyaba
      const szeles = (be.teljesMagassag * pW) / pH
      hely = {
        szeles: +szeles.toFixed(2),
        bal: be.szabadBal ?? 0,
        teto: +(75 - be.teljesMagassag).toFixed(2),
      }
    } else {
      const kartyaArany = 100 / ablak.w
      const tartalomSzeles = vagSzeles * kartyaArany
      const teljesSzeles = tartalomSzeles + ((parnaBal + parnaJobb) / oW) * tartalomSzeles
      const balSzel = (metszBal - ablak.x) * kartyaArany - (parnaBal / oW) * tartalomSzeles
      hely = {
        szeles: +teljesSzeles.toFixed(2),
        bal: +(be.tukroz ? 100 - balSzel - teljesSzeles : balSzel).toFixed(2),
        teto: +((metszFel - ablak.y) * kartyaArany - (parnaFel / oW) * tartalomSzeles).toFixed(2),
      }
    }

    const jobbSzele = hely.bal + hely.szeles
    sor = `igazitva  helye ${hely.bal}..${jobbSzele.toFixed(1)} szelessegben, ${hely.teto}-tol  (${info.width}x${info.height}, ${(info.size / 1024).toFixed(0)}kB)`
    if (jobbSzele > 55) sor += `  FIGYELEM: a robbanas ala er (${jobbSzele.toFixed(1)} > 55)`
  } else if (existsSync(kivagasFajl)) {
    // --- Szabad kivagas: bal alul, egyenesre vagott aljjal ---
    const k = await sharp(kivagasFajl).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const kW = k.info.width, kH = k.info.height
    const h = hatarok(k.data, kW, kH)
    const alj = egyenesAlj(k.data, kW, kH)

    let bal = h.bal
    let szeles = h.jobb - h.bal + 1
    if (be.tartsdJobbrol) { szeles = Math.round(szeles * be.tartsdJobbrol); bal = h.jobb - szeles + 1 }
    if (be.tartsdBalrol) szeles = Math.round(szeles * be.tartsdBalrol)
    if (be.vagasSav) {
      const teljes = h.jobb - h.bal + 1
      bal = h.bal + Math.round(teljes * be.vagasSav[0])
      szeles = Math.round(teljes * (be.vagasSav[1] - be.vagasSav[0]))
    }

    const darab = await sharp(k.data, { raw: { width: kW, height: kH, channels: 4 } })
      .extract({ left: bal, top: h.fel, width: szeles, height: alj - h.fel + 1 })
      .png()
      .toBuffer()

    const cel = Math.min(KIVAGAS_SZELES, szeles)
    const atmeretezett = await sharp(darab).resize({ width: cel }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const oW = atmeretezett.info.width, oH = atmeretezett.info.height
    const feherPx = Math.max(2, Math.round(oW * FEHER_ARANY))
    const kekPx = Math.max(1, Math.round(oW * KEK_ARANY))
    const parna = feherPx + kekPx + 4

    const parnazott = await sharp(atmeretezett.data, { raw: { width: oW, height: oH, channels: 4 } })
      .extend({ top: parna, bottom: 0, left: parna, right: parna, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .raw()
      .toBuffer({ resolveWithObject: true })

    const pW = parnazott.info.width, pH = parnazott.info.height
    const kesz = szegelyt(parnazott.data, pW, pH, feherPx, kekPx)
    const info = await sharp(kesz, { raw: { width: pW, height: pH, channels: 4 } })
      .webp({ quality: 88, alphaQuality: 100, effort: 5 })
      .toFile(`${GYOKER}public/images/cutouts/${partner.slug}.webp`)

    if (be.teljesMagassag) {
      const kSzeles = (be.teljesMagassag * pW) / pH
      hely = { szeles: +kSzeles.toFixed(2), bal: be.szabadBal ?? 0, teto: +(75 - be.teljesMagassag).toFixed(2) }
      sor = `teljes alak  szelesseg ${hely.szeles}, magassag ${be.teljesMagassag}  (${info.width}x${info.height}, ${(info.size / 1024).toFixed(0)}kB)`
    } else {
      hely = { szeles: be.szabadSzeles, bal: be.szabadBal ?? 0, teto: null }
      sor = `szabadon   szelesseg ${be.szabadSzeles}%, bal ${hely.bal}  (${info.width}x${info.height}, ${(info.size / 1024).toFixed(0)}kB)`
    }
  }

  const hatterSor = await hatterKep(partner.slug, hatterMunka, ablak, Boolean(be.tukroz), be)
  helyek[partner.slug] = {
    ...hely,
    elmosas: be.beleegetettElmosas ? 0 : (be.elmosas ?? (be.illeszt ? ELMOSAS_IGAZITOTT : ELMOSAS_SZABAD)),
    ...(be.matricaJobbra ? { matricaJobbra: true } : {}),
    ...(be.diszValtozat !== undefined ? { diszValtozat: be.diszValtozat } : {}),
  }
  jelentes.push([partner.slug, `${sor}\n${' '.repeat(20)}hatter ablak ${ablak.x},${ablak.y} ${ablak.w}x${ablak.h} -> ${hatterSor}`])
}

await writeFile(`${GYOKER}src/data/cutouts.json`, JSON.stringify(helyek, null, 2) + '\n')

/** A labak alatti zold csempek hozzaadasa a kivagashoz, elesen. */
async function zoldCsempekHozza(darabPng, szeles, magas, hatterFajl, eltolasX, eltolasY) {
  const darab = await sharp(darabPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const hatter = await sharp(hatterFajl)
    .extract({ left: eltolasX, top: eltolasY, width: szeles, height: magas })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const d = darab.data, b = hatter.data
  let db = 0
  for (let i = 0; i < szeles * magas; i++) {
    if (d[i * 4 + 3] > 128) continue
    const r = b[i * 4], g = b[i * 4 + 1], bl = b[i * 4 + 2]
    // Elenk zold: a zold csatorna sokkal erosebb a masik kettonel
    if (g > 110 && g > r + 55 && g > bl + 55) {
      d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = bl; d[i * 4 + 3] = 255
      db++
    }
  }
  console.log(`  zold csempek: ${db} keppont`)
  return sharp(d, { raw: { width: szeles, height: magas, channels: 4 } }).png().toBuffer()
}

console.log('Kartyak:')
for (const [slug, sor] of jelentes) console.log(' ', slug.padEnd(18), sor)
console.log('\nA helyek a src/data/cutouts.json fajlba kerultek.')
