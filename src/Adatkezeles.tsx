import type { ReactNode } from 'react'
import Felirat from './components/Felirat'

/**
 * Adatkezelesi tajekoztato. A szoveg a SideQuest altal adott
 * adatkezeles.md, a technikai reszek a valos beallitasok szerint:
 * Supabase eu-west-1 (Irorszag), Resend EU (Irorszag) kuldesi regio,
 * GitHub Pages tarhely, Cloudflare Web Analytics. A Resend naplo 30 napos
 * (Free, Pro es Scale csomagban egyforma).
 *
 * A hatalyba lepes napja az elesites napja: ha kesobb megy elesbe, ird at.
 */
const HATALYOS = '2026. 11. 03.'

const EMAIL = 'sidequestbp@gmail.com'

function Fejezet({ cim, children }: { cim: string; children: ReactNode }) {
  return (
    <section className="tn-panel-blokk adat-fejezet">
      <h2 className="tn-panel-cim">
        <Felirat szoveg={cim} kicsi valtozat="sotet" className="mozi-fejlec" />
      </h2>
      {children}
    </section>
  )
}

/**
 * Ket- vagy haromoszlopos tablazat. Mobilon minden sor kulon kartya lesz,
 * a cellak elott az oszlop nevevel, igy nem kell oldalra gorgetni.
 */
function Tabla({ fejlec, sorok }: { fejlec: string[]; sorok: ReactNode[][] }) {
  return (
    <table className="adat-tabla">
      <thead>
        <tr>
          {fejlec.map((f) => (
            <th key={f} scope="col">
              {f}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorok.map((sor, i) => (
          <tr key={i}>
            {sor.map((cella, j) => (
              <td key={j} data-cimke={fejlec[j]}>
                {cella}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const Jogalap = ({ children }: { children: ReactNode }) => (
  <p>
    <strong>Jogalap:</strong> {children}
  </p>
)

export default function Adatkezeles() {
  return (
    <div className="relative min-h-dvh">
      <div className="oldal-hatter" />

      <div className="tartalom-szakasz">
        <div className="tartalom-arnyek" />

        <div className="relative z-10 mx-auto w-full max-w-[480px] px-5 pt-10 pb-12 md:max-w-[640px]">
          <a href="/" className="mozi-vissza">
            Vissza a SideQuest oldalára
          </a>

          <h1 className="mozi-cim">Adatkezelési tájékoztató</h1>

          <div className="mozi-oldal-panel">
            <div className="tn-panel-belso mozi-panel adat-szoveg">
              <p className="adat-fej">
                <strong>SideQuest Budapest · sidequestbp.hu</strong>
                <br />
                Hatályos: {HATALYOS}
              </p>
              <p>
                Ez a tájékoztató leírja, milyen személyes adatokat kezelünk, amikor fiókot hozol létre a sidequestbp.hu
                oldalon és kedvezményt váltasz be. Igyekeztünk érthetően fogalmazni. Ha valami nem világos, írj nekünk.
              </p>

              <Fejezet cim="1. Ki kezeli az adataidat?">
                <ul className="adat-lista">
                  <li>
                    <strong>Adatkezelő:</strong> Leicht András egyéni vállalkozó (SideQuest Budapest)
                  </li>
                  <li>
                    <strong>Székhely:</strong> 1119 Budapest, Rátz László utca 25/B
                  </li>
                  <li>
                    <strong>Adószám:</strong> 92230037-1-43
                  </li>
                  <li>
                    <strong>Kapcsolat:</strong> <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
                  </li>
                </ul>
              </Fejezet>

              <Fejezet cim="2. Milyen adatokat kezelünk, és miért?">
                <h3 className="adat-alcim">2.1. Fiók</h3>
                <Tabla
                  fejlec={['Adat', 'Mire kell']}
                  sorok={[
                    ['E-mail-cím', 'Ezzel lépsz be: erre küldjük a belépési kódot.'],
                    ['Keresztnév', 'Ez jelenik meg a beváltási igazoláson a kasszánál.'],
                    [
                      'Nyilatkozat, hogy elmúltál 16 éves, és ennek időpontja',
                      'Igazolja, hogy jogosult vagy a regisztrációra.',
                    ],
                    ['A tájékoztató elfogadásának időpontja', 'Igazolja, hogy megismerted ezt a tájékoztatót.'],
                  ]}
                />
                <Jogalap>
                  a szolgáltatás nyújtása, vagyis a fiók és a kedvezmények biztosítása (GDPR 6. cikk (1) b) pont).
                </Jogalap>

                <h3 className="adat-alcim">2.2. Kedvezmények beváltása</h3>
                <Tabla
                  fejlec={['Adat', 'Mire kell']}
                  sorok={[
                    [
                      'Melyik partnernél, milyen kedvezményt (üdvözlő vagy normál) és mikor váltottál be',
                      'Hogy a beváltási igazolás működjön.',
                    ],
                    [
                      'A választott üdvözlő ajándék (melyik hely, hány százalék), a választás, a határidő és a beváltás ideje',
                      'Hogy az üdvözlő ajándékot csak egyszer lehessen felhasználni, és az ajánlatok darabszáma pontos legyen.',
                    ],
                    ['A beváltás rövid azonosítója és lejárata', 'Az igazolás ellenőrzéséhez a kasszánál.'],
                    [
                      'A neked kiosztott online kedvezménykód (pl. Pixity, Rage Room) és a kiosztás ideje',
                      'Hogy egy kódot csak egy ember kapjon meg, és a kódod a Fiókom oldalon is látszódjon.',
                    ],
                  ]}
                />
                <Jogalap>a szolgáltatás nyújtása (GDPR 6. cikk (1) b) pont).</Jogalap>
                <p>
                  Ezekből az adatokból <strong>összesített statisztikát</strong> is készítünk, például hogy egy hónapban
                  hány beváltás volt egy partnernél. Ezt a partnereinkkel is megoszthatjuk, de abban nincs név és
                  e-mail-cím, csak darabszám.
                </p>
                <Jogalap>
                  jogos érdek, vagyis a partnerprogram működtetése és fejlesztése (GDPR 6. cikk (1) f) pont).
                </Jogalap>

                <h3 className="adat-alcim">2.3. Technikai adatok</h3>
                <ul className="adat-lista">
                  <li>
                    <strong>Belépés megjegyzése:</strong> a böngésződ helyi tárhelyén (localStorage) tároljuk a belépési
                    munkamenetet, hogy ne kelljen mindig újra belépned. Ez nem követő süti, és csak a belépéshez kell.
                  </li>
                  <li>
                    <strong>Látogatottsági statisztika:</strong> a Cloudflare Web Analytics szolgáltatást használjuk, ami
                    süti nélkül, név nélkül számolja a látogatásokat.
                  </li>
                  <li>
                    <strong>Szervernaplók:</strong> a tárhely- és adatbázis-szolgáltatók biztonsági okból rövid ideig
                    naplózhatják az IP-címet és a böngésző típusát.
                  </li>
                </ul>
                <Jogalap>
                  jogos érdek, vagyis az oldal biztonságos és megbízható működése (GDPR 6. cikk (1) f) pont).
                </Jogalap>

                <h3 className="adat-alcim">2.4. Amit nem csinálunk</h3>
                <ul className="adat-lista">
                  <li>
                    Nem küldünk reklám e-mailt. E-mailt csak a belépési kódhoz küldünk. Ha később hírlevelet indítunk,
                    arra külön kérjük a hozzájárulásodat.
                  </li>
                  <li>Nem adjuk el az adataidat, és nem adjuk át őket reklámcélra senkinek.</li>
                  <li>Nem kérünk jelszót, telefonszámot, címet vagy születési dátumot.</li>
                </ul>
              </Fejezet>

              <Fejezet cim="3. Ki fér hozzá az adataidhoz?">
                <p>
                  Az adataidat mi kezeljük. Az oldal működéséhez az alábbi szolgáltatókat (adatfeldolgozókat)
                  használjuk:
                </p>
                <Tabla
                  fejlec={['Szolgáltató', 'Mit csinál', 'Hol']}
                  sorok={[
                    ['Supabase Inc.', 'Adatbázis és bejelentkezés', 'EU (Írország)'],
                    [
                      'Resend Inc.',
                      'A belépési kódot tartalmazó e-mailek kiküldése',
                      'EU (Írország), a cég az USA-ban működik',
                    ],
                    ['GitHub Inc.', 'A weboldal tárhelye (GitHub Pages)', 'USA'],
                    ['Cloudflare Inc.', 'Látogatottsági statisztika (Web Analytics)', 'USA'],
                  ]}
                />
                <p>
                  Ha egy szolgáltató az Európai Unión kívül (például az USA-ban) is kezelhet adatot, az adattovábbítás
                  az EU-USA adatvédelmi keretrendszer vagy az Európai Bizottság általános szerződési feltételei alapján
                  történik.
                </p>
                <p>
                  <strong>Partnereink</strong> (a helyek, ahol a kedvezményt beváltod) tőlünk nem kapják meg az
                  adataidat. A kasszánál a személyzet a telefonod képernyőjén látja a keresztnevedet és a beváltás
                  azonosítóját. Online foglalásnál a partner csak a kedvezménykódot látja, és azt az adatot, amit a
                  foglaláskor te adsz meg neki. Az ott megadott adatokat már a partner kezeli, a saját adatkezelési
                  tájékoztatója szerint.
                </p>
              </Fejezet>

              <Fejezet cim="4. Meddig tároljuk az adataidat?">
                <ul className="adat-lista">
                  <li>
                    <strong>A fiókodat és a beváltásaidat</strong> addig tároljuk, amíg a fiókod létezik.
                  </li>
                  <li>
                    <strong>Ha törlöd a fiókodat</strong> (<a href="/fiokom/">Fiókom</a> → Fiók törlése), az
                    e-mail-címedet, a nevedet, a beváltásaidat és a hozzád rendelt kódokat azonnal töröljük. A
                    biztonsági mentésekből legfeljebb 7 napon belül tűnnek el. Az e-mail-küldő szolgáltatónk (Resend)
                    a kiküldött belépési levelek naplójában legfeljebb 30 napig még tárolja az e-mail-címedet, utána
                    ez is automatikusan törlődik.
                  </li>
                  <li>
                    <strong>A korábban elkészült összesített statisztikák</strong> megmaradnak, de azokból nem lehet
                    téged azonosítani.
                  </li>
                </ul>
              </Fejezet>

              <Fejezet cim="5. 16 év alatti felhasználók">
                <p>
                  A regisztráció 16 éves kortól lehetséges. Ha kiderül, hogy egy fiókot 16 év alatti személy hozott
                  létre, a fiókot és az adatait töröljük. Ha szülőként úgy gondolod, hogy a gyermeked 16 évesen aluli
                  korban regisztrált, írj nekünk, és töröljük a fiókot.
                </p>
              </Fejezet>

              <Fejezet cim="6. Milyen jogaid vannak?">
                <p>Bármikor kérheted, hogy:</p>
                <ul className="adat-lista">
                  <li>
                    <strong>megmutassuk</strong>, milyen adatokat tárolunk rólad (hozzáférés),
                  </li>
                  <li>
                    <strong>javítsuk</strong> a hibás adatot (helyesbítés),
                  </li>
                  <li>
                    <strong>töröljük</strong> az adataidat. Ezt a <a href="/fiokom/">Fiókom</a> oldalon magad is
                    megteheted.
                  </li>
                  <li>
                    <strong>korlátozzuk</strong> az adataid kezelését,
                  </li>
                  <li>
                    <strong>kiadjuk</strong> az adataidat géppel olvasható formában (adathordozhatóság),
                  </li>
                  <li>
                    <strong>ne kezeljük</strong> az adataidat jogos érdek alapján (tiltakozás).
                  </li>
                </ul>
                <p>
                  A kérésedre legfeljebb egy hónapon belül válaszolunk. Írj a <a href={`mailto:${EMAIL}`}>{EMAIL}</a>{' '}
                  címre.
                </p>
              </Fejezet>

              <Fejezet cim="7. Panasz">
                <p>
                  Ha úgy érzed, hogy nem jól kezeljük az adataidat, először írj nekünk, és igyekszünk megoldani. Panaszt
                  tehetsz a Nemzeti Adatvédelmi és Információszabadság Hatóságnál is:
                </p>
                <ul className="adat-lista">
                  <li>
                    <strong>NAIH</strong>, 1055 Budapest, Falk Miksa utca 9-11.
                  </li>
                  <li>Postacím: 1363 Budapest, Pf. 9.</li>
                  <li>
                    <a href="https://www.naih.hu" target="_blank" rel="noopener noreferrer">
                      www.naih.hu
                    </a>
                    , <a href="mailto:ugyfelszolgalat@naih.hu">ugyfelszolgalat@naih.hu</a>
                  </li>
                </ul>
                <p>
                  Bírósághoz is fordulhatsz. A pert a lakóhelyed szerinti törvényszék előtt is megindíthatod.
                </p>
              </Fejezet>

              <Fejezet cim="8. Adatbiztonság">
                <p>
                  Az adatokat titkosított kapcsolaton (HTTPS) keresztül továbbítjuk. Az adatbázishoz csak mi férünk
                  hozzá, és a rendszer úgy van beállítva, hogy minden felhasználó csak a saját adatait láthassa.
                </p>
              </Fejezet>

              <Fejezet cim="9. Változások">
                <p>
                  Ha ez a tájékoztató érdemben változik, az oldalon jelezzük, és frissítjük a hatálybalépés dátumát.
                </p>
              </Fejezet>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
