import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getLegalDoc, legalDocs } from '@/content/legal'
import { Nudge } from '@/ui/Button'
import { LiftLink } from '@/ui/LiftLink'
import { Reveal } from '@/ui/motion'
import { ReadingProgress } from '@/ui/ReadingProgress'

export const dynamicParams = false

export function generateStaticParams() {
  return legalDocs.map((d) => ({ slug: d.slug }))
}

export async function generateMetadata({
  params,
}: PageProps<'/legales/[slug]'>): Promise<Metadata> {
  const doc = getLegalDoc((await params).slug)
  return doc ? { title: doc.title, description: doc.summary } : {}
}

export default async function LegalPage({ params }: PageProps<'/legales/[slug]'>) {
  const doc = getLegalDoc((await params).slug)
  if (!doc) notFound()

  return (
    <div className="bg-neutral-50 px-5 pt-[120px] pb-20">
      <ReadingProgress />
      <Reveal
        as="article"
        y={30}
        className="mx-auto max-w-3xl rounded-[24px] bg-white p-8 shadow-[0_10px_40px_rgba(0,0,0,0.05)] sm:p-12"
      >
        <LiftLink
          href="/ayuda"
          lift={0}
          className="group mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand"
        >
          <Nudge x={-4}>
            <ArrowLeft className="size-4" aria-hidden />
          </Nudge>
          <span className="underline-offset-4 group-hover:underline">
            Volver al Centro de Ayuda
          </span>
        </LiftLink>
        <h1 className="font-display text-4xl font-bold text-ink">{doc.title}</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Última actualización:{' '}
          {new Date(`${doc.updated}T12:00:00-03:00`).toLocaleDateString('es-AR', {
            dateStyle: 'long',
          })}
        </p>
        <hr className="my-6 border-neutral-100" />
        <div className="prose-boxie">{doc.body}</div>
      </Reveal>
    </div>
  )
}
