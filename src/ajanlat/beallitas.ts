import { z } from 'zod'
import nyers from '../data/ajanlat.json'
import partnersData from '../data/partners.json'
import type { Partner } from '../types'
import type { Feluliras } from './valasztas.ts'

const partnerek = partnersData as Partner[]
const slugok = new Set(partnerek.map((p) => p.slug))

const Sema = z.object({
  /**
   * Kezi felulirasok. Amelyik napra van bejegyzes, ott ez nyer a forgatas
   * felett. Egy napra egy bejegyzes.
   */
  felulirasok: z
    .array(
      z.object({
        datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'ÉÉÉÉ-HH-NN alakban kell'),
        slug: z.string().min(1),
      }),
    )
    .default([]),
})

const eredmeny = Sema.safeParse(nyers)
if (!eredmeny.success) {
  throw new Error(
    'Hibas src/data/ajanlat.json:\n' +
      eredmeny.error.issues.map((h) => `  ${h.path.join('.')}: ${h.message}`).join('\n'),
  )
}

/*
 * Elgepelt slug eseten a felulirás csendben hatastalan lenne, ezert inkabb
 * mar a buildnel elszallunk. Ugyanigy a ketszer felvett napnal.
 */
const ismert = new Set<string>()
for (const f of eredmeny.data.felulirasok) {
  if (!slugok.has(f.slug)) {
    throw new Error(`Hibas src/data/ajanlat.json: nincs ilyen partner: "${f.slug}" (${f.datum})`)
  }
  if (ismert.has(f.datum)) {
    throw new Error(`Hibas src/data/ajanlat.json: ${f.datum} ketszer szerepel`)
  }
  ismert.add(f.datum)
}

export const felulirasok: Feluliras[] = eredmeny.data.felulirasok
