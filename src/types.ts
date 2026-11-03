export type Partner = {
  name: string
  /** URL resz a megosztashoz, pl. "magic-rooms". Innen jon a /magic-rooms/ cim. */
  slug: string
  /** A felvetel datuma, pl. "2026-10-15". Ures: nem uj partner. */
  addedDate?: string
  discount: string
  /**
   * Az udvozlo kedvezmeny szazaleka, amit a user partnerenkent egyszer kap
   * meg. A normal kedvezmeny a discount mezo. Ha valtozik, az adatbazisba is
   * at kell vinni: npm run partnerek-sql, aztan a supabase/partnerek.sql.
   */
  welcomeDiscount?: number
  /**
   * "helyszini": a kasszanal, gombnyomassal valtja be.
   * "online_kod": foglalaskor egyedi koddal (3. fazis).
   */
  redemptionMode?: 'helyszini' | 'online_kod'
  /**
   * Partnerenkenti kapcsolo az uj fiokos beváltáshoz. Hamisnal a latogato
   * a regi modon latja (QR, kozos kod). Teszteleshez ?uj=1, lasd
   * src/fiok/kapcsolo.ts.
   */
  ujBevaltas?: boolean
  /** Online partnernel a foglalasi oldal, ide visz a kod mellett a gomb. */
  bookingUrl?: string
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
  /**
   * Mely napokon hasznalhato a kedvezmeny. 1 = hetfo ... 7 = vasarnap.
   * Hianyzo vagy ures lista eseten minden nap. A mai ajanlat ez alapjan
   * hagyja ki azt, aki aznap zarva van vagy akinel a kedvezmeny nem el.
   * Pl. a Magic Rooms feltetele: "Csak hetkoznap ervenyes."
   */
  openDays?: number[]
  /**
   * Szerepeljen-e a mai ajanlat forgatasaban. Hianyzo mezo eseten igen.
   * A false teljes kihagyast jelent, nem csak egy-egy napot: ilyenkor a
   * hely sosem kerul fel mai vagy holnapi ajanlatkent.
   */
  dailyPick?: boolean
  /** Lenyilo resz. Ami ures, az nem jelenik meg. */
  description?: string
  address?: string
  steps?: string[]
  conditions?: string
}
