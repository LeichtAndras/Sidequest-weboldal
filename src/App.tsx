import { useState } from 'react'
import partnersData from './data/partners.json'
import PartnerCard from './components/PartnerCard'
import { InstagramIcon, TikTokIcon } from './components/Icons'
import type { Partner } from './types'

const partners = partnersData as Partner[]

const toNumber = (discount: string) => Number.parseFloat(discount.replace(/[^\d.,]/g, '').replace(',', '.'))
const topDiscount = Math.max(...partners.map((partner) => toNumber(partner.discount)))

export default function App() {
  const [openPartner, setOpenPartner] = useState<string | null>(null)

  return (
    <div className="min-h-dvh bg-ink">
      <div className="mx-auto w-full max-w-[480px] px-5 pt-10 pb-10">
        <header className="text-center">
          <img
            src="/logo.png"
            alt="SideQuest"
            width={180}
            className="mx-auto w-[180px] mix-blend-screen"
          />
          <p className="mt-2 text-[1.02rem] text-cream/70">Budapest legjobb helyei, olcsóbban.</p>
          <div className="mx-auto mt-6 h-px w-16 bg-accent/50" />
        </header>

        <main className="mt-8 flex flex-col gap-3.5">
          {partners.map((partner) => (
            <PartnerCard
              key={partner.name}
              partner={partner}
              featured={toNumber(partner.discount) === topDiscount}
              open={openPartner === partner.name}
              onToggle={() =>
                setOpenPartner((current) => (current === partner.name ? null : partner.name))
              }
            />
          ))}
        </main>

        <section className="mt-12 rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-[1.25rem] font-semibold text-cream">Kik vagyunk?</h2>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-cream/70">
            Budapesti diákok vagyunk, akik unták, hogy mindig ugyanoda megyünk. Elkezdtük felkutatni
            a város legjobb helyeit, és megmutatni őket TikTokon és Instagramon. Most a
            partnereinkkel azon dolgozunk, hogy ezek a helyek neked olcsóbbak is legyenek.
          </p>
        </section>

        <footer className="mt-12 text-center">
          <p className="text-[0.98rem] leading-snug text-cream/70">
            Új helyek folyamatosan. Kövess minket, hogy elsőként tudd.
          </p>

          <div className="mt-5 flex gap-3">
            <a
              href="https://instagram.com/side_quest.bp"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 font-semibold text-ink transition active:scale-[0.98]"
            >
              <InstagramIcon className="h-5 w-5" />
              Instagram
            </a>
            <a
              href="https://tiktok.com/@side_quest.bp"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-accent/60 px-4 py-3.5 font-semibold text-cream transition active:scale-[0.98]"
            >
              <TikTokIcon className="h-5 w-5" />
              TikTok
            </a>
          </div>

          <p className="mt-9 text-[0.75rem] text-cream/70">Frissítve: 2026. szeptember</p>
        </footer>
      </div>
    </div>
  )
}
