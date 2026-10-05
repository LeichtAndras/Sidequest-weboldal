import { useCallback, useEffect, useRef, useState } from 'react'
import { MoziHiba, szavaz, toplista, type ToplistaSor } from './api'
import { szakasz, type Szakasz } from './beallitas'
import { eszkozAzonosito, mentsSzavazat, sajatSzavazat, type Szavazatom } from './eszkoz'

const FRISSITES = 15000

export type SzavazasAdat = {
  wikidataId: string
  cim: string
  ev: number | null
  rendezo: string | null
}

type Opciok = {
  /**
   * Jarjon-e a 15 masodperces frissites. A fooldali kartya csukva nem
   * mutatja a listat, ezert ott hamis: a szavazatszamhoz eleg az egyszeri
   * lekerdezes betolteskor.
   */
  frissitsen?: boolean
}

/**
 * A szavazas teljes allapota egy helyen: szakasz, sajat szavazat, toplista
 * es a szavazas kuldese. A fooldali blokk es a /mozi oldal is ezt hasznalja,
 * igy a logika nincs ketszer leirva. Egy oldalon csak egy peldany fusson,
 * kulonben ketszer kerdeznenk le a toplistat.
 */
export function useSzavazas({ frissitsen = true }: Opciok = {}) {
  // Az idofuggo reszek csak a bongeszoben allnak be, igy a statikus HTML
  // es az elso kliens rajzolas megegyezik.
  const [faz, setFaz] = useState<Szakasz | null>(null)
  const [szavazatom, setSzavazatom] = useState<Szavazatom | null>(null)
  const [sorok, setSorok] = useState<ToplistaSor[]>([])
  const [osszes, setOsszes] = useState(0)
  const [listaTolt, setListaTolt] = useState(true)
  const [listaHiba, setListaHiba] = useState<string | null>(null)
  const [uzenet, setUzenet] = useState<string | null>(null)
  const elo = useRef(true)

  useEffect(() => {
    setFaz(szakasz(Date.now()))
    setSzavazatom(sajatSzavazat())
  }, [])

  const toltsList = useCallback(async (jel?: AbortSignal) => {
    try {
      const adat = await toplista(jel)
      if (!elo.current) return
      setSorok(adat.lista)
      setOsszes(adat.osszes)
      setListaHiba(null)
    } catch (baj) {
      if (baj instanceof DOMException && baj.name === 'AbortError') return
      if (!elo.current) return
      setListaHiba(
        baj instanceof MoziHiba ? baj.message : 'A toplistát most nem sikerült betölteni.',
      )
    } finally {
      if (elo.current) setListaTolt(false)
    }
  }, [])

  // Egyszeri lekerdezes betolteskor: ebbol jon a szavazatszam a kartyan
  useEffect(() => {
    elo.current = true
    const megszakito = new AbortController()
    void toltsList(megszakito.signal)
    return () => {
      elo.current = false
      megszakito.abort()
    }
  }, [toltsList])

  // Ismetlodo frissites csak akkor, ha a lista latszik is
  useEffect(() => {
    if (!frissitsen) return
    const ora = window.setInterval(() => void toltsList(), FRISSITES)
    return () => window.clearInterval(ora)
  }, [toltsList, frissitsen])

  const lejart = useCallback(() => setFaz(szakasz(Date.now())), [])

  const kuldSzavazat = useCallback(
    async (adat: SzavazasAdat) => {
      const eszkoz = eszkozAzonosito()
      if (!eszkoz) {
        throw new MoziHiba(
          'A böngésződ nem engedi a helyi tárolást, ezért most nem tudunk szavazatot rögzíteni.',
        )
      }

      await szavaz({ ...adat, eszkozId: eszkoz })
      const sajat: Szavazatom = { wikidataId: adat.wikidataId, cim: adat.cim }
      mentsSzavazat(sajat)
      setSzavazatom(sajat)
      setUzenet('Köszi! Szavazatod rögzítve.')
      void toltsList()
    },
    [toltsList],
  )

  const nyitva = faz === 'nyitva'
  const lezart = faz === 'lezart'

  return {
    faz,
    nyitva,
    lezart,
    szavazatom,
    sorok,
    osszes,
    listaTolt,
    listaHiba,
    setListaHiba,
    uzenet,
    lejart,
    kuldSzavazat,
    szavazhato: nyitva && !szavazatom,
    sajatAListaban: szavazatom
      ? sorok.some((sor) => sor.wikidata_id === szavazatom.wikidataId)
      : false,
  }
}

export type Szavazas = ReturnType<typeof useSzavazas>
