export type Partner = {
  name: string
  discount: string
  category: string
  redeem: string
  /** Online kuponkod, ha van. Ilyenkor megjelenik a Masolas gomb. */
  code?: string
  /** Kep utvonala a public mappabol, pl. "/kepek/base-bar.jpg". Ha ures, nincs kep. */
  image?: string
  /** Lenyilo resz. Ami ures, az nem jelenik meg. */
  description?: string
  address?: string
  steps?: string[]
  conditions?: string
}
