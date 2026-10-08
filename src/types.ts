export type Partner = {
  name: string
  /** URL resz a megosztashoz, pl. "magic-rooms". Innen jon a /magic-rooms/ cim. */
  slug: string
  /** A felvetel datuma, pl. "2026-10-15". Ures: nem uj partner. */
  addedDate?: string
  discount: string
  /**
   * A helyszinkep fajlneve a /public/venues mappabol, pl. "base-bar.webp".
   * Az npm run helyszinek irja be. Uj hely eseten eleg ezt megadni.
   */
  venue?: string
  category: string
  redeem: string
  /** Online kuponkod, ha van. Ilyenkor megjelenik a Masolas gomb. */
  code?: string
  /** Kep utvonala a public mappabol, pl. "/images/base-bar.jpg". A nyers foto. */
  image?: string
  /** CSS object-position a kephez, pl. "center 20%". Ures: kozep. */
  imagePosition?: string
  /**
   * Kep a lenyilo panel tetejen, a leiras folott, teljes szelessegben.
   * A /public/partnerkepek mappabol a fajlnev kiterjesztes nelkul, pl.
   * "yoaron-ralph-lauren". A scripts/helyszinek.mjs keszit belole webp-et
   * ket szelessegben, vagas nelkul, igy a kepen levo szoveg nem esik le.
   */
  panelImage?: string
  /** A panelkep alt szovege. Panelkep mellett mindig legyen megadva. */
  panelImageAlt?: string
  /** Lenyilo resz. Ami ures, az nem jelenik meg. */
  description?: string
  address?: string
  steps?: string[]
  conditions?: string
}
