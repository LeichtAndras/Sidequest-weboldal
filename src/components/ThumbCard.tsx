import { memo, useMemo, useState } from 'react'
import type { Partner } from '../types'
import { ujPartner } from '../partner'
import kivagasHelyek from '../data/cutouts.json'
import { szovegSzeles, useBetuKesz } from '../felirat'
import Felirat from './Felirat'
import ThumbDetails from './ThumbDetails'
import { QrIcon, SpeechIcon, TagIcon } from './Icons'

type Props = {
  partner: Partner
  open: boolean
  onToggle: () => void
}

/*
 * Minden meret cqw-ben, vagyis a kartya szelessegehez merve. A kartya 4:3,
 * ezert a magassaga 75cqw. Ezek a hatarok tartjak egymastol az elemeket.
 */
const NEV_TETO = 4.5
const NEV_JOBB = 88
/** A nev balra legfeljebb eddig er. Ennel balra a kivagott szemely all. */
const NEV_BAL_HATAR = 38
/** A kategoria cimke betuje, a kereteinek helyigenye es a betukoze cqw-ben. */
const CIMKE_BETU = 3.2
const CIMKE_KERET = 5.1
const CIMKE_BETUKOZ = 0.04
/** Ekkora res marad a cimke es a nev kozott. */
const CIMKE_RES = 3
/** Ha ennel kisebb res jutna, a cimke a nev fole kerul. */
const CIMKE_SZUK = 5
/** A cimke magassaga a kereteivel. */
const CIMKE_MAGAS = 6
/** A TOBB gomb meretei, ebbol tudjuk, meddig er a bevaltas matrica. */
const GOMB_JOBB = 4.5
const GOMB_KERET = 8.2
const GOMB_IKON = 5
const GOMB_KOZ = 1.2
const GOMB_BETU = 4.4
/** A bevaltas matrica betuje es a kereteinek helyigenye. */
const BEVALTAS_BETU = 3.2
const BEVALTAS_KERET = 5.1
const BEVALTAS_IKON = 4
const BEVALTAS_KOZ = 1.4
/** A robbanas teteje. A nevnek ez folott kell vegetnie. */
const ROBBANAS_TETO = 28.5
const NEV_MAX = 11

/**
 * A nev betumerete es sorszama. Harom dolog korlatozza: a rendelkezesre allo
 * szelesseg, a robbanasig marado magassag, es egy felso hatar. A szelesseget
 * valodi merraebol tudjuk, nem karakterszambol.
 */
function nevMeret(nev: string, doboz: number, teto: number) {
  const szavak = nev.split(/\s+/).filter(Boolean)
  const egySorban = doboz / szovegSzeles(nev)
  const hely = ROBBANAS_TETO - 1.5 - teto

  if (szavak.length === 1 || egySorban >= NEV_MAX) {
    return { meret: Math.min(NEV_MAX, egySorban, hely / 1.04), sorok: 1 }
  }

  // Ket sor: azt a torest keressuk, ahol a hosszabbik sor a legrovidebb
  let legjobb = Infinity
  for (let i = 1; i < szavak.length; i++) {
    const elso = szovegSzeles(szavak.slice(0, i).join(' '))
    const masodik = szovegSzeles(szavak.slice(i).join(' '))
    legjobb = Math.min(legjobb, Math.max(elso, masodik))
  }

  // A nev nem erhet le a robbanasig
  return { meret: Math.min(NEV_MAX, doboz / legjobb, hely / (2 * 1.04)), sorok: 2 }
}

/** A bevaltas modja rovid matrica szoveggel es ikonnal. */
function bevaltasMod(partner: Partner) {
  if (partner.code) return { szoveg: 'Online kuponkód', Ikon: TagIcon }
  if (partner.redeem.includes('QR')) return { szoveg: 'QR a helyszínen', Ikon: QrIcon }
  return { szoveg: 'Mondd: SideQuest', Ikon: SpeechIcon }
}

/** Robbanas alakzat, szeles ellipszisbe. Allando, minden betoltesnel ugyanaz. */
function robbanasUt(agak = 13, kulsoX = 63, kulsoY = 45, aranyBelso = 0.755) {
  const pontok: string[] = []
  for (let i = 0; i < agak * 2; i++) {
    const kulso = i % 2 === 0 ? 1 : aranyBelso
    const tenyezo = kulso * (1 + 0.07 * Math.sin(i * 2.3))
    const szog = (Math.PI * i) / agak - Math.PI / 2
    pontok.push(
      `${(70 + kulsoX * tenyezo * Math.cos(szog)).toFixed(2)},${(50 + kulsoY * tenyezo * Math.sin(szog)).toFixed(2)}`,
    )
  }
  return `M${pontok.join('L')}Z`
}

const ROBBANAS = robbanasUt()

const CSILLAG = 'M0,-1 C0.12,-0.34 0.34,-0.12 1,0 C0.34,0.12 0.12,0.34 0,1 C-0.12,0.34 -0.34,0.12 -1,0 C-0.34,-0.12 -0.12,-0.34 0,-1 Z'

type KivagasHely = {
  /** Szelesseg a kartya szelessegehez merve. */
  szeles: number
  bal: number
  /** Ha null, a kivagas alja a kartya aljara kerul. Kulonben ez a felso szele. */
  teto: number | null
  /** A hatter elmosasa keppontban. */
  elmosas: number
  /** Ha a kivagas elfoglalja a bal also sarkot, a matrica a gomb melle kerul. */
  matricaJobbra?: boolean
  /** Rogzitett csillogas keszlet, ha az alapertelmezett takarna valamit. */
  diszValtozat?: number
}

const HELYEK = kivagasHelyek as Record<string, KivagasHely>

type Csillogas = { x: number; y: number; r: number; szin: string }

/**
 * Harom rogzitett csillogas keszlet. Kartyankent allando, nem valtozik
 * betolteskor. Mind a kartyan belul van, a nevtol es a robbanastol tavol.
 */
const CSILLOGASOK: Csillogas[][] = [
  [
    { x: 17, y: 12, r: 2.6, szin: '#36B9F0' },
    { x: 46, y: 34, r: 2.2, szin: '#FFFFFF' },
    { x: 50, y: 57, r: 1.9, szin: '#FF2D78' },
    { x: 30, y: 65, r: 2.3, szin: '#36B9F0' },
  ],
  [
    { x: 34, y: 10, r: 2.3, szin: '#FFFFFF' },
    { x: 44, y: 41, r: 2.5, szin: '#FF2D78' },
    { x: 14, y: 52, r: 2.1, szin: '#36B9F0' },
    { x: 56, y: 64, r: 1.9, szin: '#FFFFFF' },
  ],
  [
    { x: 22, y: 11, r: 2.1, szin: '#FFFFFF' },
    { x: 48, y: 31, r: 2.7, szin: '#36B9F0' },
    { x: 15, y: 45, r: 1.9, szin: '#FF2D78' },
    { x: 43, y: 63, r: 2.3, szin: '#FFFFFF' },
  ],
]

/** Allando valasztas a slugbol, hogy minden betoltesnel ugyanaz legyen. */
function csillogasValasztas(slug: string, valtozat?: number) {
  if (valtozat !== undefined) return CSILLOGASOK[valtozat % CSILLOGASOK.length]
  let osszeg = 0
  for (const betu of slug) osszeg += betu.charCodeAt(0)
  return CSILLOGASOK[osszeg % CSILLOGASOK.length]
}

/** Harom rovid vonas, ami a megadott pontbol sugarzik kifele. */
function Vonasok({ x, y, szog }: { x: number; y: number; szog: number }) {
  return (
    <>
      {[-24, 0, 24].map((elteres, i) => {
        const ir = ((szog + elteres) * Math.PI) / 180
        const tol = 1.3
        const ig = tol + (i === 1 ? 3.6 : 2.9)
        return (
          <line
            key={i}
            x1={(x + tol * Math.cos(ir)).toFixed(2)}
            y1={(y + tol * Math.sin(ir)).toFixed(2)}
            x2={(x + ig * Math.cos(ir)).toFixed(2)}
            y2={(y + ig * Math.sin(ir)).toFixed(2)}
            stroke="#FFFFFF"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        )
      })}
    </>
  )
}

function vanReszlet(partner: Partner) {
  return Boolean(
    partner.description?.trim() ||
      partner.address?.trim() ||
      partner.conditions?.trim() ||
      partner.steps?.some((lepes) => lepes.trim() !== ''),
  )
}

function ThumbCard({ partner, open, onToggle }: Props) {
  const [kepHiba, setKepHiba] = useState(false)

  const hely = HELYEK[partner.slug]
  const vanKivagas = Boolean(partner.cutout) && Boolean(hely) && hely.szeles > 0
  const sajatHatter = Boolean(partner.cutoutBg)
  // Kivagas mellett a sajat fotót elmossuk, kulon hatterkepet nem
  const elmosott = vanKivagas && !sajatHatter
  const hatterAlap = `/images/cards/${partner.slug}${sajatHatter ? '-bg' : ''}`

  const lenyithato = vanReszlet(partner)
  const panelId = `reszletek-${partner.slug}`
  const csillogasok = csillogasValasztas(partner.slug, hely?.diszValtozat)

  const cimke = ujPartner(partner) ? `ÚJ · ${partner.category}` : partner.category

  // A betuk betoltese utan ujra merunk, addig a tartalek betu szerint szamolunk
  const betuKesz = useBetuKesz()
  const bevaltas = bevaltasMod(partner)

  const { nevBal, nevDoboz, nevTeto, cimkeFent, nev, bevaltasBetu, gombBal, nevTinta } = useMemo(() => {
    // A vaszon nem szamolja bele a betukozt, ezert kulon hozzaadjuk
    const cimkeSzeles =
      CIMKE_KERET + (szovegSzeles(cimke) + cimke.length * CIMKE_BETUKOZ) * CIMKE_BETU
    const cimkeJobb = 5 + cimkeSzeles

    // Egy sorban a nev sosem kezdodhet a cimke alatt. Ha igy tul szuk lenne
    // a res, a cimke a nev fole kerul, jobbra igazitva.
    const oldalt = Math.max(NEV_BAL_HATAR, cimkeJobb + CIMKE_RES)
    const fent = oldalt - cimkeJobb < CIMKE_SZUK

    const bal = fent ? NEV_BAL_HATAR : oldalt
    const teto = fent ? NEV_TETO + CIMKE_MAGAS + 2 : NEV_TETO
    const doboz = NEV_JOBB - bal

    // A bevaltas matrica a TOBB gombig er, annal tovabb nem
    const gombSzeles = (felirat: string) =>
      GOMB_KERET + GOMB_IKON + GOMB_KOZ + szovegSzeles(felirat) * GOMB_BETU
    const gombBal = 100 - GOMB_JOBB - Math.max(gombSzeles('Több'), gombSzeles('Vissza'))
    const szabadHely = gombBal - 5 - 2.5 - BEVALTAS_KERET - BEVALTAS_IKON - BEVALTAS_KOZ
    const betu = Math.min(
      BEVALTAS_BETU,
      szabadHely / (szovegSzeles(bevaltas.szoveg) + bevaltas.szoveg.length * 0.02),
    )

    const meret = nevMeret(partner.name, doboz, teto)

    // A nev tenyleges tintaja: jobbra igazitott, ezert a legszelesebb sorbol
    // szamoljuk a bal szelet, a kozepet pedig a teljes nevblokkbol.
    const szavak = partner.name.split(/\s+/).filter(Boolean)
    let legszelesebb = szovegSzeles(partner.name)
    if (meret.sorok === 2) {
      legszelesebb = 0
      let legjobb = Infinity
      for (let i = 1; i < szavak.length; i++) {
        const elso = szovegSzeles(szavak.slice(0, i).join(' '))
        const masodik = szovegSzeles(szavak.slice(i).join(' '))
        if (Math.max(elso, masodik) < legjobb) {
          legjobb = Math.max(elso, masodik)
          legszelesebb = legjobb
        }
      }
    }

    return {
      nevBal: bal,
      nevDoboz: doboz,
      nevTeto: teto,
      cimkeFent: fent,
      nev: meret,
      bevaltasBetu: betu,
      gombBal,
      nevTinta: {
        bal: NEV_JOBB - legszelesebb * meret.meret,
        kozep: teto + (meret.sorok * meret.meret * 1.04) / 2,
      },
    }
    // A betuKesz valtozasa szandekosan ujraszamoltat
  }, [cimke, partner.name, bevaltas.szoveg, betuKesz])

  // A bal oldali vonascsoport nem erhet bele a kivagas fejebe
  const balNyilY =
    hely?.teto != null
      ? Math.max(6.5, Math.min(nevTinta.kozep, hely.teto - 3))
      : nevTinta.kozep

  return (
    <article id={`partner-${partner.slug}`} className="tn-kartya scroll-mt-6">
      <div
        className="tn-lap"
        style={hely ? ({ ['--cutout-bg-blur' as string]: `${hely.elmosas}px` }) : undefined}
      >
        {!kepHiba ? (
          <img
            className={`tn-foto ${elmosott ? 'tn-foto-elmosott' : ''}`}
            src={`${hatterAlap}-640.webp`}
            srcSet={`${hatterAlap}-640.webp 640w, ${hatterAlap}-1200.webp 1200w`}
            sizes="(min-width: 768px) 440px, 92vw"
            alt={vanKivagas ? '' : partner.name}
            aria-hidden={vanKivagas ? true : undefined}
            loading="lazy"
            decoding="async"
            onError={() => setKepHiba(true)}
          />
        ) : null}

        <div className={elmosott ? 'tn-fatyol-eros' : 'tn-fatyol'} />

        {vanKivagas ? (
          <img
            className="tn-kivagas"
            src={partner.cutout}
            alt={partner.name}
            loading="lazy"
            decoding="async"
            style={
              hely.teto === null
                ? { width: `${hely.szeles}%`, left: 0, bottom: 0 }
                : {
                    width: `${hely.szeles}cqw`,
                    left: `${hely.bal}cqw`,
                    top: `${hely.teto}cqw`,
                    bottom: 'auto',
                  }
            }
          />
        ) : null}

        <svg className="tn-diszek" viewBox="0 0 100 75" aria-hidden="true">
          {/* Vonasok a nev ket oldalan, kifele sugarozva */}
          {/*
            A vonasok a nevblokk magassaganak kozepen allnak. Ha a kivagas
            feje odaerne, a bal oldali csoport a kivagas fole kerul.
          */}
          <Vonasok x={nevTinta.bal - 2.6} y={balNyilY} szog={180} />
          <Vonasok x={NEV_JOBB + 2} y={nevTinta.kozep} szog={0} />

          {csillogasok.map((cs, i) => (
            <path
              key={i}
              d={CSILLAG}
              fill={cs.szin}
              stroke="#0B1B3A"
              strokeWidth={0.5 / cs.r}
              transform={`translate(${cs.x} ${cs.y}) scale(${cs.r})`}
            />
          ))}
        </svg>

        <span className={`tn-kategoria ${cimkeFent ? 'tn-kategoria-fent' : ''}`}>{cimke}</span>

        {/* Bevaltas modja csukva is latszik */}
        <span
          className="tn-bevaltas"
          style={
            hely?.matricaJobbra
              ? { fontSize: `${bevaltasBetu.toFixed(2)}cqw`, left: 'auto', right: `${(100 - gombBal + 2.5).toFixed(1)}cqw` }
              : { fontSize: `${bevaltasBetu.toFixed(2)}cqw` }
          }
        >
          <bevaltas.Ikon className="tn-bevaltas-ikon" />
          {bevaltas.szoveg}
        </span>

        <Felirat
          szoveg={partner.name}
          className="tn-nev"
          style={{
            top: `${nevTeto}cqw`,
            left: `${nevBal}cqw`,
            width: `${nevDoboz}cqw`,
            fontSize: `${nev.meret.toFixed(2)}cqw`,
          }}
        />

        <div className="tn-robbanas">
          <svg viewBox="0 0 140 100" aria-hidden="true" style={{ transform: 'rotate(-5deg)' }}>
            <path d={ROBBANAS} fill="#FF2D78" stroke="#0B1B3A" strokeWidth="3.4" strokeLinejoin="round" />
          </svg>
          <span className="tn-robbanas-szoveg">
            <Felirat szoveg={partner.discount} kicsi style={{ fontSize: '10.5cqw' }} />
            <Felirat szoveg="Kedvezmény" kicsi style={{ fontSize: '3cqw', marginTop: '0.3cqw' }} />
          </span>
        </div>

        {lenyithato ? (
          <button
            type="button"
            className="tn-kapszula tn-tobb"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={panelId}
          >
            <span className="tn-gomb-felirat tn-gomb-felirat-sotet" style={{ fontSize: '4.4cqw' }}>
              {open ? 'Vissza' : 'Több'}
            </span>
            <svg
              viewBox="0 0 24 24"
              width="1em"
              height="1em"
              aria-hidden="true"
              style={{
                fontSize: '5cqw',
                transform: open ? 'rotate(180deg)' : 'none',
                transition: 'transform 200ms ease',
              }}
            >
              <path
                d="M12 4v13m0 0 6-6m-6 6-6-6"
                fill="none"
                stroke="#0B1B3A"
                strokeWidth="3.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 4v13m0 0 6-6m-6 6-6-6"
                fill="none"
                stroke="#0B1B3A"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : null}

      </div>

      {lenyithato ? (
        <div id={panelId} inert={!open} className={`tn-panel ${open ? 'tn-panel-nyitva' : ''}`}>
          <div>
            <ThumbDetails partner={partner} />
          </div>
        </div>
      ) : null}

      {/* A keret a kartya es a lenyitott resz kore egyszerre fut */}
      <div className="tn-keret" />
    </article>
  )
}

export default memo(ThumbCard)
