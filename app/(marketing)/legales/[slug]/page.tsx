import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLegalDoc, legalDocs } from '@/content/legal'

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
      <article className="mx-auto max-w-3xl rounded-[24px] bg-white p-8 shadow-[0_10px_40px_rgba(0,0,0,0.05)] sm:p-12">
        <Link
          href="/ayuda"
          className="mb-6 inline-block text-sm font-semibold text-brand hover:underline"
        >
          ← Volver al Centro de Ayuda
        </Link>
        <h1 className="font-display text-4xl font-bold text-ink">{doc.title}</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Última actualización:{' '}
          {new Date(`${doc.updated}T12:00:00-03:00`).toLocaleDateString('es-AR', {
            dateStyle: 'long',
          })}
        </p>
        <hr className="my-6 border-neutral-100" />
        <div className="prose-boxie">{doc.body}</div>
      </article>
    </div>
  )
}
