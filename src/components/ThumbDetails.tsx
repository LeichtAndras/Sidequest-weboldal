import type { Partner } from '../types'
import Felirat from './Felirat'
import CouponCode from './CouponCode'
import ShareButton from './ShareButton'
import { InfoIcon, MapPinIcon } from './Icons'

const terkepLink = (cim: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cim)}`

/** A lenyitott resz tartalma, a kartya folytatasakent, torfeher alapon. */
export default function ThumbDetails({ partner }: { partner: Partner }) {
  const lepesek = partner.steps?.filter((lepes) => lepes.trim() !== '') ?? []

  return (
    <div className="tn-panel-belso">
      {partner.panelImage ? (
        <img
          className="tn-panel-kep"
          src={`/partnerkepek/${partner.panelImage}.webp`}
          srcSet={`/partnerkepek/${partner.panelImage}-640.webp 640w, /partnerkepek/${partner.panelImage}.webp 960w`}
          sizes="(min-width: 768px) 440px, 92vw"
          alt={partner.panelImageAlt ?? ''}
          loading="lazy"
          decoding="async"
        />
      ) : null}

      {partner.description ? <p className="tn-panel-szoveg">{partner.description}</p> : null}

      {partner.code ? (
        <div className="tn-panel-blokk">
          <CouponCode code={partner.code} />
        </div>
      ) : null}

      {partner.address ? (
        <div className="tn-panel-blokk">
          <p className="tn-panel-sor">
            <MapPinIcon className="tn-panel-ikon" />
            <span>{partner.address}</span>
          </p>
          <a
            href={terkepLink(partner.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="tn-kapszula tn-kapszula-panel"
          >
            <MapPinIcon className="tn-kapszula-ikon" />
            <span className="tn-gomb-felirat tn-gomb-felirat-sotet" style={{ fontSize: '4.4cqw' }}>
              Megnyitás térképen
            </span>
          </a>
        </div>
      ) : null}

      {lepesek.length > 0 ? (
        <div className="tn-panel-blokk">
          <Felirat
            szoveg="A beváltás lépései"
            kicsi
            valtozat="sotet"
            style={{ fontSize: '4.8cqw' }}
          />
          <ol className="tn-lepesek">
            {lepesek.map((lepes, index) => (
              <li key={lepes} className="tn-lepes">
                <span className="tn-lepes-szam">{index + 1}</span>
                <span>{lepes}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {partner.conditions ? (
        <p className="tn-feltetel">
          <InfoIcon className="tn-panel-ikon" />
          <span>{partner.conditions}</span>
        </p>
      ) : null}

      <ShareButton
        partner={partner}
        className="tn-kapszula tn-kapszula-panel tn-kapszula-megosztas"
        ikonOsztaly="tn-kapszula-ikon"
        felirat={(szoveg) => (
          <span className="tn-gomb-felirat tn-gomb-felirat-sotet" style={{ fontSize: '4.4cqw' }}>
            {szoveg}
          </span>
        )}
      />
    </div>
  )
}
