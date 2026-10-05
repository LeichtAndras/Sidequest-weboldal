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
// A fooldali mozi kartya hattere: a SugarMozi terme a kozos felirattal.
//
// A nyers fotón korbe sotet a terem, kulonosen a jobb szelen. Ha azt is
// kiszolgalnank, a kartya szelen fekete csik maradna, ezert mar itt a
// vaszonra vagunk, kis rahagyassal. Igy barmelyik aranynal keptartalom
// er a kartya szelere.
// ---------------------------------------------------------------------
const KARTYA_FORRAS = 'kepek-eredeti/sugarmozi-terem.webp'
/** A vaszon hatarai a nyers fotón, a kep szazalekaban. */
const VASZON = { bal: 0.095, jobb: 0.815, fent: 0.15, lent: 0.78 }

const kartyaMeret = await sharp(KARTYA_FORRAS).metadata()
const vagas = {
  left: Math.round(kartyaMeret.width * VASZON.bal),
  top: Math.round(kartyaMeret.height * VASZON.fent),
  width: Math.round(kartyaMeret.width * (VASZON.jobb - VASZON.bal)),
  height: Math.round(kartyaMeret.height * (VASZON.lent - VASZON.fent)),
}
console.log(`\nkartya forras: ${kartyaMeret.width}x${kartyaMeret.height} -> vagva ${vagas.width}x${vagas.height}`)

const vagott = () => sharp(KARTYA_FORRAS).extract(vagas)

await writeFile(`${CEL}/sugarmozi-terem.jpg`, await vagott().jpeg({ quality: 86 }).toBuffer())

// Nem nagyitunk: a vagas sajat szelessege a felso hatar
for (const szeles of [Math.min(1600, vagas.width), 640]) {
  const puffer = await vagott().resize({ width: szeles }).webp({ quality: 84 }).toBuffer()
  await writeFile(`${CEL}/sugarmozi-terem_${szeles}.webp`, puffer)
  console.log(`sugarmozi-terem_${szeles}.webp  ${Math.round(puffer.length / 1024)} kB`)
}
