import { z } from 'zod'
import nyers from '../data/movie-vote.json'

/** ISO datum, amit a Date is ert. Ures stringet nem fogadunk el. */
const idopont = z.string().refine((ertek) => !Number.isNaN(Date.parse(ertek)), {
  message: 'Nem ervenyes datum',
})

const Sema = z
  .object({
    voteStart: idopont,
    voteEnd: idopont,
    /** Ha null, az esemeny idopontja meg nincs meg. */
    eventDate: idopont.nullable(),
    venue: z.string().min(1),
    /** Ha null, a hero helyen egyelore ures hely all. */
    heroImage: z.string().min(1).nullable(),
    intro: z.string().min(1),
    steps: z.array(z.string().min(1)).min(1),
    disclaimer: z.string().min(1),
  })
  .refine((ertek) => Date.parse(ertek.voteEnd) > Date.parse(ertek.voteStart), {
    message: 'A szavazas vege nem lehet a kezdete elott',
    path: ['voteEnd'],
  })

/**
 * A szavazas beallitasai. Hibas tartalom eseten mar a buildnel elszall,
 * mert az eloreneneles is ezt a modult tolti be.
 */
const eredmeny = Sema.safeParse(nyers)
if (!eredmeny.success) {
  throw new Error(
    'Hibas src/data/movie-vote.json:\n' +
      eredmeny.error.issues.map((hiba) => `  ${hiba.path.join('.')}: ${hiba.message}`).join('\n'),
  )
}

export type MoziBeallitas = z.infer<typeof Sema>
export const beallitas: MoziBeallitas = eredmeny.data

export const kezdet = Date.parse(beallitas.voteStart)
export const vege = Date.parse(beallitas.voteEnd)

export type Szakasz = 'elotte' | 'nyitva' | 'lezart'

/** A szavazas allapota egy adott pillanatban. */
export function szakasz(most: number): Szakasz {
  if (most < kezdet) return 'elotte'
  if (most > vege) return 'lezart'
  return 'nyitva'
}
