/**
 * A filmszavazas hero kepe. Atlatszo hatterrel keszul webpben es png-ben,
 * plusz egy sotet hatteru valtozat a kozossegi megosztasnak, mert az
 * atlatszosagot a megosztasi elonezetek rosszul kezelik.
 *
 * Futtatas: npm run mozikep
 */
import { mkdir, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const FORRAS = 'kepek-eredeti/mozi-hero.png'
const CEL = 'public/images/mozi'
/** A kartyak kerete, ez a hatter a megosztasi kepen. */
const SOTETKEK = { r: 11, g: 27, b: 58, alpha: 1 }
/** A kozossegi elonezetek szabvanyos merete. */
const OG = { szeles: 1200, magas: 630 }

await mkdir(CEL, { recursive: true })

const eredeti = sharp(FORRAS)
const { width, height } = await eredeti.metadata()
console.log(`forras: ${width}x${height}`)

// Atlatszo valtozatok. A png a tartalek, ha valahol nem menne a webp.
for (const szeles of [1600, 900]) {
  const puffer = await sharp(FORRAS).resize({ width: szeles }).webp({ quality: 88 }).toBuffer()
  await writeFile(`${CEL}/hero-${szeles}.webp`, puffer)
  console.log(`hero-${szeles}.webp  ${Math.round(puffer.length / 1024)} kB`)
}

const tartalek = await sharp(FORRAS)
  .resize({ width: 1600 })
  .png({ compressionLevel: 9, palette: true, quality: 90 })
  .toBuffer()
await writeFile(`${CEL}/hero-1600.png`, tartalek)
console.log(`hero-1600.png   ${Math.round(tartalek.length / 1024)} kB`)

// Megosztasi kep: a hero sotetkek lapra helyezve, vagas nelkul
const belso = await sharp(FORRAS)
  .resize({ width: OG.szeles, height: OG.magas, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer()

const og = await sharp({
  create: { width: OG.szeles, height: OG.magas, channels: 4, background: SOTETKEK },
})
  .composite([{ input: belso }])
  .png({ compressionLevel: 9, palette: true, quality: 90 })
  .toBuffer()

await writeFile(`${CEL}/og-mozi.png`, og)
console.log(`og-mozi.png     ${Math.round(og.length / 1024)} kB  (${OG.szeles}x${OG.magas}, sotet hatteren)`)

// ---------------------------------------------------------------------
// A fooldali mozi kartya hattere: a SugarMozi terme, elotérben popcornnal.
//
// A vaszonra belegetunk egy kerdojelet, nem CSS retegkent tesszuk ra. Igy
// barmilyen vagasnal pontosan a vaszon kozepen marad.
// ---------------------------------------------------------------------
const KARTYA_FORRAS = 'kepek-eredeti/sugarmozi-popcorn.jpg'
/** A vaszon helye a fotón, meressel, a kep szazalekaban. */
const VASZON = { kozepX: 0.46, kozepY: 0.463, magassag: 0.245 }
/** A kerdojel a vaszon magassaganak ennyi reszet toltse ki. */
const JEL_ARANY = 0.6
/** Par fok doles, hogy illjen a matricas stilushoz. */
const JEL_DOLES = -5

const kartyaMeret = await sharp(KARTYA_FORRAS).metadata()
const KW = kartyaMeret.width
const KH = kartyaMeret.height
// A Titan One nagybetu magassaga nagyjabol a betumeret 0,72-szerese
const jelBetu = Math.round((KH * VASZON.magassag * JEL_ARANY) / 0.72)
const jelX = Math.round(KW * VASZON.kozepX)
const jelY = Math.round(KH * VASZON.kozepY)

const jelSzoveg = (szin, vastag) =>
  `<text x="${jelX}" y="${jelY}" font-family="Titan One" font-size="${jelBetu}" text-anchor="middle" dominant-baseline="central" fill="${szin}"` +
  (vastag ? ` stroke="${szin}" stroke-width="${vastag}" stroke-linejoin="round"` : '') +
  `>?</text>`

const jelSvg = (tartalom) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${KW}" height="${KH}"><g transform="rotate(${JEL_DOLES} ${jelX} ${jelY})">${tartalom}</g></svg>`,
  )

// A kek dereng egy vastag, elmosott kerdojel. Ketszer tesszuk ra, hogy erosebb legyen.
const dereng = await sharp(jelSvg(jelSzoveg('#36B9F0', Math.round(jelBetu * 0.14))))
  .blur(Math.round(jelBetu * 0.09))
  .toBuffer()

const jeles = await sharp(KARTYA_FORRAS)
  .composite([
    { input: dereng },
    { input: dereng },
    { input: jelSvg(jelSzoveg('#1E9BE0', Math.round(jelBetu * 0.085))) },
    { input: jelSvg(jelSzoveg('#FFFCF3', 0)) },
  ])
  .png()
  .toBuffer()

console.log(`\nkartya forras: ${KW}x${KH}, kerdojel betumeret ${jelBetu}, kozep (${jelX}, ${jelY})`)

await writeFile(`${CEL}/sugarmozi-popcorn.jpg`, await sharp(jeles).jpeg({ quality: 88 }).toBuffer())

// Nem nagyitunk: a forras szelessege a felso hatar
for (const szeles of [Math.min(1199, KW), 640]) {
  const puffer = await sharp(jeles).resize({ width: szeles }).webp({ quality: 84 }).toBuffer()
  await writeFile(`${CEL}/sugarmozi-popcorn_${szeles}.webp`, puffer)
  console.log(`sugarmozi-popcorn_${szeles}.webp  ${Math.round(puffer.length / 1024)} kB`)
}
