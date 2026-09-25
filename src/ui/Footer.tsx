import { Mail, MapPin, MessageCircle } from 'lucide-react'
import Image from 'next/image'
import type { Route } from 'next'
import { legalDocs } from '@/content/legal'
import { site } from '@/content/site'
import type { BusinessContact } from '@/domain/business'
import { FooterLink, Heartbeat, SocialButton } from './FooterLinks'
import { Stagger, StaggerItem } from './motion'
import { SocialIcon, type SocialNetwork } from './SocialIcon'

const EXPLORE: { href: Route; label: string }[] = [
  { href: '/', label: 'Inicio' },
  { href: '/galeria', label: 'Galería de temáticas' },
  { href: '/precios', label: 'Planes y precios' },
  // El prototipo linkeaba /about, que no existía.
  { href: '/nosotros', label: 'Nuestra historia' },
  { href: '/mi-boxie', label: 'Ya compré: entrar a mi Boxie' },
]

const HELP: { href: Route; label: string }[] = [
  { href: '/ayuda', label: 'Centro de ayuda' },
  { href: '/soporte' as Route, label: 'Mis consultas (soporte)' },
  { href: '/contacto', label: 'Contacto' },
  ...legalDocs.map((d) => ({ href: `/legales/${d.slug}` as Route, label: d.title })),
]

/** Una red se muestra solo si apunta a un perfil (no a la portada de la red). */
const isProfile = (url: string) => {
  try {
    return new URL(url).pathname.replace(/\/+$/, '').length > 1
  } catch {
    return false
  }
}

function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="relative mb-6 inline-block text-lg font-semibold tracking-wider text-white uppercase after:absolute after:-bottom-2 after:left-1/2 after:h-0.5 after:w-8 after:-translate-x-1/2 after:bg-brand md:after:left-0 md:after:translate-x-0">
      {children}
    </h3>
  )
}

/**
 * El pie del sitio. Los datos de contacto (mail de soporte, WhatsApp e
 * Instagram) salen de la Configuración del panel.
 */
export function Footer({ contact }: { contact: BusinessContact }) {
  const social: { network: SocialNetwork; href: string; label: string }[] = [
    ...(contact.instagram
      ? [{ network: 'instagram' as const, href: contact.instagram.url, label: 'Instagram' }]
      : []),
    ...(contact.whatsapp
      ? [{ network: 'whatsapp' as const, href: contact.whatsapp.url, label: 'WhatsApp' }]
      : []),
    ...(
      [
        { network: 'tiktok', href: site.social.tiktok, label: 'TikTok' },
        { network: 'youtube', href: site.social.youtube, label: 'YouTube' },
        { network: 'facebook', href: site.social.facebook, label: 'Facebook' },
      ] as const
    ).filter((s) => isProfile(s.href)),
  ]

  return (
    <footer className="relative mt-auto w-full overflow-hidden border-t-[3px] border-brand bg-night pt-16 text-white">
      <Stagger
        className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-5 pb-12 text-center sm:px-8 md:grid-cols-2 md:text-left lg:grid-cols-4"
        step={0.1}
        amount={0.1}
      >
        <StaggerItem>
          <Image
            src="/brand/boxie-logo.png"
            alt={contact.name}
            width={120}
            height={42}
            className="mx-auto mb-5 h-auto w-[120px] brightness-0 invert md:mx-0"
          />
          <p className="mb-5 text-sm leading-relaxed text-neutral-400">{site.tagline}</p>
          <p className="mb-2 flex items-center justify-center gap-2 text-sm text-neutral-300 md:justify-start">
            <MapPin size={16} className="shrink-0 text-brand" aria-hidden /> {site.location}
          </p>
          <p className="mb-2 flex items-center justify-center gap-2 text-sm md:justify-start">
            <Mail size={16} className="shrink-0 text-brand" aria-hidden />
            <a
              href={`mailto:${contact.supportEmail}`}
              className="break-all text-neutral-300 transition-colors hover:text-brand"
            >
              {contact.supportEmail}
            </a>
          </p>
          {contact.whatsapp && (
            <p className="flex items-center justify-center gap-2 text-sm md:justify-start">
              <MessageCircle size={16} className="shrink-0 text-brand" aria-hidden />
              <a
                href={contact.whatsapp.url}
                target="_blank"
                rel="noreferrer"
                className="text-neutral-300 transition-colors hover:text-brand"
              >
                {contact.whatsapp.display}
              </a>
            </p>
          )}
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
          <FooterHeading>Te ayudamos</FooterHeading>
          <ul className="space-y-3">
            {HELP.map((l) => (
              <li key={l.href}>
                <FooterLink href={l.href}>{l.label}</FooterLink>
              </li>
            ))}
          </ul>
        </StaggerItem>

        <StaggerItem>
          <FooterHeading>Sigamos conectados</FooterHeading>
          {social.length > 0 ? (
            <div className="mb-8 flex flex-wrap justify-center gap-4 md:justify-start">
              {social.map((s) => (
                <SocialButton key={s.network} href={s.href} label={s.label}>
                  <SocialIcon network={s.network} size={18} />
                </SocialButton>
              ))}
            </div>
          ) : (
            <p className="mb-8 text-sm text-neutral-400">Pronto, en tus redes favoritas.</p>
          )}
          {contact.instagram && (
            <p className="-mt-4 mb-8 text-sm text-neutral-400">
              Seguinos en{' '}
              <a
                href={contact.instagram.url}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-neutral-200 hover:text-brand"
              >
                {contact.instagram.handle}
              </a>
            </p>
          )}
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
        <p>
          © {new Date().getFullYear()} {contact.name}. Todos los derechos reservados.
        </p>
        <p className="text-neutral-400">
          Hecho con <Heartbeat /> en Argentina
        </p>
      </div>
    </footer>
  )
}
