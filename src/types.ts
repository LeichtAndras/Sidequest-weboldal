export type Partner = {
  name: string
  discount: string
  category: string
  redeem: string
  /** Online kuponkod, ha van. Ilyenkor megjelenik a Masolas gomb. */
  code?: string
  /** Lenyilo resz. Ami ures, az nem jelenik meg. */
  description?: string
  address?: string
  steps?: string[]
  conditions?: string
}
