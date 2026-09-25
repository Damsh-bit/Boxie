'use server'

import { z } from 'zod'
import { ThemeMetaInputSchema } from '@/domain/admin/inputs'
import type { ThemeStatus } from '@/domain/admin/types'
import { ThemeListingSchema } from '@/domain/catalog'
import { parseThemeConfig } from '@/slides/config'
import { generateTheme } from '@/slides/generator/generate'
import { ThemeConfigSchema, type ThemeConfigInput } from '@/slides/theme-config'
import { AdminRepoError } from '@/server/admin/repo'
import { CONTENT_ROLES, runAction } from '../../_lib/action'

/**
 * Temáticas: todo cambio pasa por el contrato de las slides. Un borrador se
 * puede guardar a medio hacer (con avisos); publicar exige que la
 * configuración entera sea válida y congela una versión inmutable.
 */

const paths = (id?: string) => [
  '/admin',
  '/admin/tematicas',
  ...(id ? [`/admin/tematicas/${id}`] : []),
  // La tienda (en demo lee del panel).
  '/',
  '/galeria',
]

/** De la configuración ya validada a la forma que se guarda (props resueltas). */
function resolved(config: unknown): ThemeConfigInput {
  const parsed = parseThemeConfig(config)
  if (!parsed.success)
    throw new AdminRepoError(
      `No se puede publicar: ${parsed.issues.slice(0, 3).join(' · ')}${parsed.issues.length > 3 ? ' …' : ''}`,
    )
  return {
    palette: parsed.data.palette,
    slides: parsed.data.slides.map((s) => ({
      key: s.key,
      kind: s.kind,
      props: s.props as Record<string, unknown>,
      frame: s.frame,
      ...(s.plan ? { plan: s.plan } : {}),
    })),
  }
}

export async function createTheme(name: string) {
  return runAction<{ id: string }>(
    { roles: CONTENT_ROLES, revalidate: paths() },
    async ({ repo, actor }) => {
      const clean = z.string().trim().min(2, 'Poné un nombre').max(80).parse(name)
      const [plans, themes] = await Promise.all([repo.listPlans(), repo.listThemes()])
      const generated = generateTheme(clean, {
        plans,
        existingSlugs: themes.map((t) => t.slug),
        sortOrder: Math.max(0, ...themes.map((t) => t.sortOrder)) + 1,
      })
      const created = await repo.createTheme(
        {
          slug: generated.slug,
          name: generated.name,
          category: generated.category,
          description: generated.description,
          listing: generated.listing,
          config: generated.config,
          sortOrder: generated.sortOrder,
          origin: 'manual',
        },
        actor,
      )
      return { message: `Creamos "${generated.name}" como borrador`, data: { id: created.id } }
    },
  )
}

export async function saveThemeDraft(id: string, config: unknown) {
  return runAction<{ issues: string[] }>(
    { roles: CONTENT_ROLES, revalidate: paths(id) },
    async ({ repo, actor }) => {
      // La forma general tiene que estar bien; los campos pueden estar a medio completar.
      ThemeConfigSchema.parse(config)
      await repo.saveThemeDraft(id, config, actor)
      const check = parseThemeConfig(config)
      return {
        message: check.success
          ? 'Borrador guardado'
          : 'Borrador guardado (con cosas para corregir)',
        data: { issues: check.success ? [] : check.issues },
      }
    },
  )
}

export async function publishTheme(id: string, config: unknown) {
  return runAction<{ version: number }>(
    { roles: CONTENT_ROLES, revalidate: paths(id) },
    async ({ repo, actor }) => {
      const version = await repo.publishTheme(id, resolved(config), actor)
      return {
        message: `Publicaste la versión ${version.version}`,
        data: { version: version.version },
      }
    },
  )
}

export async function updateThemeMeta(id: string, meta: unknown, listing: unknown) {
  return runAction({ roles: CONTENT_ROLES, revalidate: paths(id) }, async ({ repo, actor }) => {
    const parsedMeta = ThemeMetaInputSchema.parse(meta)
    const parsedListing = ThemeListingSchema.parse(listing)
    // La tienda muestra las fotos con next/image: solo hosts configurados.
    const blocked = parsedListing.images.find(
      (src) =>
        !src.startsWith('/') &&
        !src.startsWith('https://images.unsplash.com/') &&
        !/^https:\/\/[a-z0-9-]+\.supabase\.co\//.test(src),
    )
    if (blocked)
      throw new AdminRepoError(
        'Una de las fotos no es de Unsplash, de Supabase Storage ni del sitio: la tienda no la puede mostrar.',
      )
    await repo.updateTheme(id, { ...parsedMeta, listing: parsedListing }, actor)
    return { message: 'Ficha guardada' }
  })
}

export async function setThemeStatus(id: string, status: ThemeStatus) {
  return runAction({ roles: CONTENT_ROLES, revalidate: paths(id) }, async ({ repo, actor }) => {
    const value = z.enum(['draft', 'published', 'archived']).parse(status)
    await repo.updateTheme(id, { status: value }, actor)
    const messages: Record<ThemeStatus, string> = {
      published: 'Está a la venta',
      draft: 'Se sacó de la venta',
      archived: 'Temática archivada',
    }
    return { message: messages[value] }
  })
}

export async function duplicateTheme(id: string) {
  return runAction<{ id: string }>(
    { roles: CONTENT_ROLES, revalidate: paths() },
    async ({ repo, actor }) => {
      const copy = await repo.duplicateTheme(id, actor)
      return { message: 'Temática duplicada como borrador', data: copy }
    },
  )
}

export async function deleteTheme(id: string) {
  return runAction({ roles: CONTENT_ROLES, revalidate: paths() }, async ({ repo, actor }) => {
    await repo.deleteTheme(id, actor)
    return { message: 'Borrador eliminado' }
  })
}

/** La configuración de una versión publicada (para volver a usarla como borrador). */
export async function loadVersionConfig(versionId: string) {
  return runAction<{ config: unknown }>(
    { roles: CONTENT_ROLES, revalidate: [] },
    async ({ repo }) => {
      const config = await repo.getVersionConfig(z.string().min(1).max(64).parse(versionId))
      if (!config) throw new AdminRepoError('Esa versión no existe.', 'not_found')
      return { data: { config } }
    },
  )
}
