import { Mail, MapPin } from 'lucide-react'
import Image from 'next/image'
import type { Route } from 'next'
import { legalDocs } from '@/content/legal'
import { site } from '@/content/site'
import { FooterLink, Heartbeat, SocialButton } from './FooterLinks'
import { Stagger, StaggerItem } from './motion'
import { SocialIcon, type SocialNetwork } from './SocialIcon'

const EXPLORE: { href: Route; label: string }[] = [
  { href: '/', label: 'Inicio' },
  { href: '/galeria', label: 'Galería de Ejemplos' },
  // El prototipo linkeaba /about, que no existía.
  { href: '/nosotros', label: 'Nuestra Historia' },
  { href: '/contacto', label: 'Contacto' },
  { href: '/mi-boxie' as Route, label: 'Ya compré: entrar a mi Boxie' },
]

const HELP: { href: Route; label: string }[] = [
  { href: '/ayuda', label: 'Preguntas Frecuentes' },
  ...legalDocs.map((d) => ({ href: `/legales/${d.slug}` as Route, label: d.title })),
]

const SOCIAL: { network: SocialNetwork; href: string; label: string }[] = [
  { network: 'instagram', href: site.social.instagram, label: 'Instagram' },
  { network: 'tiktok', href: site.social.tiktok, label: 'TikTok' },
  { network: 'youtube', href: site.social.youtube, label: 'YouTube' },
  { network: 'facebook', href: site.social.facebook, label: 'Facebook' },
]

function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="relative mb-6 inline-block text-lg font-semibold tracking-wider text-white uppercase after:absolute after:-bottom-2 after:left-1/2 after:h-0.5 after:w-8 after:-translate-x-1/2 after:bg-brand md:after:left-0 md:after:translate-x-0">
      {children}
    </h3>
  )
}

export function Footer() {
  return (
    <footer className="relative mt-auto w-full overflow-hidden border-t-[3px] border-brand bg-night pt-16 text-white">
      <Stagger
        className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-5 pb-12 text-center md:grid-cols-2 md:text-left lg:grid-cols-4"
        step={0.1}
        amount={0.1}
      >
        <StaggerItem>
          <Image
            src="/brand/boxie-logo.png"
            alt="Boxie Digital"
            width={120}
            height={42}
            className="mx-auto mb-5 h-auto w-[120px] brightness-0 invert md:mx-0"
          />
          <p className="mb-5 text-sm leading-relaxed text-neutral-400">{site.tagline}</p>
          <p className="mb-2 flex items-center justify-center gap-2 text-sm text-neutral-300 md:justify-start">
            <MapPin size={16} className="shrink-0 text-brand" /> {site.location}
          </p>
          <p className="flex items-center justify-center gap-2 text-sm text-neutral-300 md:justify-start">
            <Mail size={16} className="shrink-0 text-brand" /> {site.emails.hello}
          </p>
        </StaggerItem>

        <StaggerItem>
          <FooterHeading>Explorá</FooterHeading>
          <ul className="space-y-3">
            {EXPLORE.map((l) => (
              <li key={l.href}>
                <FooterLink href={l.href}>{l.label}</FooterLink>
              </li>
            ))}
          </ul>
        </StaggerItem>

        <StaggerItem>
          <FooterHeading>Te Ayudamos</FooterHeading>
          <ul className="space-y-3">
            {HELP.map((l) => (
              <li key={l.href}>
                <FooterLink href={l.href}>{l.label}</FooterLink>
              </li>
            ))}
          </ul>
        </StaggerItem>

        <StaggerItem>
          <FooterHeading>Sigamos Conectados</FooterHeading>
          <div className="mb-8 flex flex-wrap justify-center gap-4 md:justify-start">
            {SOCIAL.map((s) => (
              <SocialButton key={s.network} href={s.href} label={s.label}>
                <SocialIcon network={s.network} size={18} />
              </SocialButton>
            ))}
          </div>
          {site.legal.dataFiscalUrl && site.legal.dataFiscalImage && (
            <div>
              <p className="mb-1 text-xs text-neutral-500 uppercase">Data Fiscal</p>
              <a href={site.legal.dataFiscalUrl} target="_blank" rel="noreferrer">
                <Image
                  src={site.legal.dataFiscalImage}
                  alt="Data Fiscal"
                  width={60}
                  height={82}
                  className="rounded bg-white p-0.5"
                />
              </a>
            </div>
          )}
        </StaggerItem>
      </Stagger>

      <div className="flex w-full flex-col items-center justify-between gap-2 border-t border-white/5 bg-night-deep px-5 py-5 text-center text-sm text-neutral-500 md:flex-row">
        <p>© {new Date().getFullYear()} Boxie Digital. Todos los derechos reservados.</p>
        <p className="text-neutral-400">
          Hecho con <Heartbeat /> en Argentina
        </p>
      </div>
    </footer>
  )
}
