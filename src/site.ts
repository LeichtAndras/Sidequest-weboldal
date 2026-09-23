/** Az eles oldal cime. A megosztott linkek mindig erre mutatnak. */
export const SITE_URL = 'https://sidequestbp.hu'

/** Egy partner megoszthato cime, pl. https://sidequestbp.hu/magic-rooms/ */
export const partnerUrl = (slug: string) => `${SITE_URL}/${slug}/`

/** A cimsorbol kiolvasott slug, pl. "/magic-rooms/" -> "magic-rooms". */
export function slugFromPath(pathname: string) {
  return pathname.replace(/^\/+|\/+$/g, '').toLowerCase()
}
