export type Partner = {
  name: string
  discount: string
  category: string
  redeem: string
  /** Online kuponkod, ha van. Ilyenkor megjelenik a Masolas gomb. */
  code?: string
  /** Kep utvonala a public mappabol, pl. "/images/base-bar.jpg". Ha ures, nincs kep. */
  image?: string
  /** CSS object-position a kephez, pl. "center 20%". Ures: kozep. */
  imagePosition?: string
  /** Sotet fotohoz: fenyero es kontraszt megemelese, csak ezen a kartyan. */
  brightenImage?: boolean
  /** Lenyilo resz. Ami ures, az nem jelenik meg. */
  description?: string
  address?: string
  steps?: string[]
  conditions?: string
}
