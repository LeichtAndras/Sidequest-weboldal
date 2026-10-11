import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import {
  KEZDET,
  ajanlatRa,
  budapestiNap,
  elozoNap,
  hetNapja,
  kovetkezoEjfel,
  kovetkezoNap,
  nyitva,
} from './valasztas.ts'

/** Rovid partner, csak amennyi a valasztashoz kell. */
function p(slug: string, openDays?: number[]) {
  return { name: slug, slug, discount: '10%', category: 'Teszt', redeem: 'QR', openDays } as never
}

const OSSZES = [p('a'), p('b'), p('c'), p('d'), p('e')]

test('budapestiNap a budapesti naptari napot adja, nem az UTC-t', () => {
  // 2026-06-01 23:30 UTC mar junius 2. Budapesten (nyari ido, +2)
  assert.equal(budapestiNap(Date.parse('2026-06-01T23:30:00Z')), '2026-06-02')
  // 2026-01-01 22:30 UTC meg januar 1. (teli ido, +1)
  assert.equal(budapestiNap(Date.parse('2026-01-01T22:30:00Z')), '2026-01-01')
})

test('a nap lepteto es a het napja helyes', () => {
  assert.equal(kovetkezoNap('2026-10-31'), '2026-11-01')
  assert.equal(elozoNap('2026-03-01'), '2026-02-28')
  assert.equal(hetNapja('2026-10-12'), 1) // hetfo
  assert.equal(hetNapja('2026-10-18'), 7) // vasarnap
})

test('zarva tarto helyet nem valaszt', () => {
  // Csak "c" van nyitva vasarnap (7)
  const lista = [p('a', [1, 2, 3, 4, 5]), p('b', [1, 2, 3, 4, 5, 6]), p('c', [7])]
  const vasarnap = '2026-10-18'
  assert.equal(hetNapja(vasarnap), 7)
  assert.equal(ajanlatRa(lista, vasarnap)?.slug, 'c')
})

test('ha mindenki zarva van, akkor sem marad ures', () => {
  const lista = [p('a', [1]), p('b', [1])] // csak hetfon nyitva
  const vasarnap = '2026-10-18'
  const talalat = ajanlatRa(lista, vasarnap)
  assert.ok(talalat, 'kellett volna valakit valasztani')
  assert.ok(['a', 'b'].includes(talalat.slug))
})

test('ket egymas utani napon nem ugyanaz', () => {
  let nap = KEZDET
  let elozo = ajanlatRa(OSSZES, nap)?.slug
  for (let i = 0; i < 400; i++) {
    nap = kovetkezoNap(nap)
    const mai = ajanlatRa(OSSZES, nap)?.slug
    assert.notEqual(mai, elozo, `${nap}: ket egymas utani napon ugyanaz (${mai})`)
    elozo = mai
  }
})

test('egyetlen partner eseten ugyanaz jon, de nem szall el', () => {
  const egy = [p('a')]
  assert.equal(ajanlatRa(egy, '2026-10-12')?.slug, 'a')
  assert.equal(ajanlatRa(egy, '2026-10-13')?.slug, 'a')
})

test('ures listara null', () => {
  assert.equal(ajanlatRa([], '2026-10-12'), null)
})

test('a kezi felulirás nyer a forgatas felett', () => {
  const nap = '2026-10-20'
  const forgatas = ajanlatRa(OSSZES, nap)?.slug
  const mas = OSSZES.map((x) => (x as unknown as { slug: string }).slug).find((s) => s !== forgatas)
  assert.ok(mas)
  const felul = ajanlatRa(OSSZES, nap, [{ datum: nap, slug: mas }])
  assert.equal(felul?.slug, mas)
})

test('a felulirás a zarva tartast is felulirja', () => {
  const lista = [p('a', [1, 2, 3, 4, 5]), p('b')]
  const vasarnap = '2026-10-18'
  assert.equal(ajanlatRa(lista, vasarnap, [{ datum: vasarnap, slug: 'a' }])?.slug, 'a')
})

test('ismeretlen slugra a felulirás nem szamit', () => {
  const nap = '2026-10-20'
  const forgatas = ajanlatRa(OSSZES, nap)?.slug
  assert.equal(ajanlatRa(OSSZES, nap, [{ datum: nap, slug: 'nincs-ilyen' }])?.slug, forgatas)
})

test('ugyanarra a napra mindig ugyanaz jon', () => {
  const egyszer = ajanlatRa(OSSZES, '2026-12-24')?.slug
  const megegyszer = ajanlatRa(OSSZES, '2026-12-24')?.slug
  assert.equal(egyszer, megegyszer)
})

test('oraatallitas: 2026-10-25, amikor a nap 25 oras', () => {
  // Szombat este 23:00 budapesti ido, meg nyari idoben (+2)
  const szombatEste = Date.parse('2026-10-24T21:00:00Z')
  assert.equal(budapestiNap(szombatEste), '2026-10-24')

  const ejfel = kovetkezoEjfel(szombatEste)
  assert.equal(new Date(ejfel).toISOString(), '2026-10-24T22:00:00.000Z')
  assert.equal(budapestiNap(ejfel), '2026-10-25')
  assert.equal(ejfel - szombatEste, 60 * 60 * 1000, 'egy ora volt hatra ejfelig')

  // Az oraatallitas utan, teli idoben (+1) is a helyes ejfelt adja
  const vasarnapDelutan = Date.parse('2026-10-25T12:00:00Z')
  assert.equal(budapestiNap(vasarnapDelutan), '2026-10-25')
  const kovetkezo = kovetkezoEjfel(vasarnapDelutan)
  assert.equal(new Date(kovetkezo).toISOString(), '2026-10-25T23:00:00.000Z')
  assert.equal(budapestiNap(kovetkezo), '2026-10-26')
})

test('oraatallitas: tavasszal, amikor a nap 23 oras', () => {
  // 2026-03-29-en hajnali 2-rol 3-ra ugrik az ora
  const szombatEste = Date.parse('2026-03-28T22:30:00Z') // 23:30 budapesti ido
  assert.equal(budapestiNap(szombatEste), '2026-03-28')
  const ejfel = kovetkezoEjfel(szombatEste)
  assert.equal(new Date(ejfel).toISOString(), '2026-03-28T23:00:00.000Z')
  assert.equal(budapestiNap(ejfel), '2026-03-29')
})

test('az oraatallitas napjan is pontosan egy ajanlat van', () => {
  const napok = ['2026-10-24', '2026-10-25', '2026-10-26']
  const valasztottak = napok.map((n) => ajanlatRa(OSSZES, n)?.slug)
  assert.ok(valasztottak.every(Boolean))
  assert.notEqual(valasztottak[0], valasztottak[1])
  assert.notEqual(valasztottak[1], valasztottak[2])
})

test('nyitva: hianyzo vagy ures lista minden napot jelent', () => {
  assert.equal(nyitva(p('a') as never, '2026-10-18'), true)
  assert.equal(nyitva(p('a', []) as never, '2026-10-18'), true)
  assert.equal(nyitva(p('a', [1]) as never, '2026-10-18'), false)
})

/*
 * Az alabbiak mar a valodi partnerlistan futnak, nem kitalalt adatokon.
 * Igy ha valaki elrontja az openDays mezot, a teszt szol.
 */

const VALODI = (await import('../data/partners.json', { with: { type: 'json' } })).default as never[]

test('valodi adatok: a Magic Rooms sosem esik hetvegere', () => {
  const magic = (VALODI as unknown as Array<{ slug: string; openDays?: number[] }>).find(
    (x) => x.slug === 'magic-rooms',
  )
  assert.ok(magic, 'nincs magic-rooms a partnerek kozott')
  assert.deepEqual(magic.openDays, [1, 2, 3, 4, 5], 'a Magic Rooms feltetele: csak hetkoznap')

  let nap = KEZDET
  for (let i = 0; i < 400; i++) {
    nap = kovetkezoNap(nap)
    const hetvege = hetNapja(nap) >= 6
    const valasztott = ajanlatRa(VALODI, nap)
    if (hetvege) {
      assert.notEqual(valasztott?.slug, 'magic-rooms', `${nap} hetvege, megis a Magic Rooms jott`)
    }
  }
})

test('valodi adatok: minden napra jut ajanlat, es nincs ket egyforma egymas utan', () => {
  let nap = KEZDET
  let elozo: string | undefined
  for (let i = 0; i < 400; i++) {
    nap = kovetkezoNap(nap)
    const mai = ajanlatRa(VALODI, nap)
    assert.ok(mai, `${nap}: nem jott ajanlat`)
    assert.notEqual(mai.slug, elozo, `${nap}: ket egymas utani napon ugyanaz`)
    elozo = mai.slug
  }
})

test('a dailyPick false teljesen kiveszi a forgatasbol', () => {
  const lista = [p('a'), p('b'), { ...(p('c') as object), dailyPick: false } as never]
  let nap = KEZDET
  for (let i = 0; i < 200; i++) {
    nap = kovetkezoNap(nap)
    assert.notEqual(ajanlatRa(lista, nap)?.slug, 'c', `${nap}: a kihagyott hely megis feljott`)
  }
  // Meg a felulirás sem hozza fel
  assert.notEqual(ajanlatRa(lista, '2026-11-05', [{ datum: '2026-11-05', slug: 'c' }])?.slug, 'c')
})

test('valodi adatok: a Szelfimuzeum sosem jon fel', () => {
  const sm = (VALODI as unknown as Array<{ slug: string; dailyPick?: boolean }>).find(
    (x) => x.slug === 'szelfimuzeum',
  )
  assert.ok(sm, 'nincs szelfimuzeum a partnerek kozott')
  assert.equal(sm.dailyPick, false)

  let nap = KEZDET
  for (let i = 0; i < 400; i++) {
    nap = kovetkezoNap(nap)
    assert.notEqual(ajanlatRa(VALODI, nap)?.slug, 'szelfimuzeum', `${nap}: megis a Szelfimuzeum jott`)
  }
})
