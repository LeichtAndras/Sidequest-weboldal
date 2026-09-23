/** Az eles oldal cime. A megosztott linkek mindig erre mutatnak. */
export const SITE_URL = 'https://sidequestbp.hu'

/** Egy partner megoszthato cime, pl. https://sidequestbp.hu/magic-rooms/ */
export const partnerUrl = (slug: string) => `${SITE_URL}/${slug}/`

/** A cimsorbol kiolvasott slug, pl. "/magic-rooms/" -> "magic-rooms". */
export function slugFromPath(pathname: string) {
  return pathname.replace(/^\/+|\/+$/g, '').toLowerCase()
}

/**
 * Tally urlap a feliratkozashoz. A vegpontot es a mezo azonositot
 * az urlap sajat oldalanak beküldeséből olvastuk ki:
 * POST https://api.tally.so/forms/<urlap>/respond
 */
export const TALLY_FORM_ID = 'b5Px4o'
export const TALLY_EMAIL_MEZO = '9cc701d7-0021-4a92-a809-dc29152e40e7'
export const TALLY_VEGPONT = `https://api.tally.so/forms/${TALLY_FORM_ID}/respond`
