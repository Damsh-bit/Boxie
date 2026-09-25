import 'server-only'
import { z } from 'zod'

/**
 * Variables de entorno del servidor, validadas una sola vez y con errores
 * claros. Se leen perezosamente: el build no exige secretos que solo usa en
 * runtime una ruta puntual.
 */

const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== '' ? v.trim() : undefined))

const base64Key = z
  .string()
  .refine((v) => Buffer.from(v, 'base64').length === 32, 'debe ser una clave de 32 bytes en base64')

const schema = z
  .object({
    NEXT_PUBLIC_SITE_URL: z.url().transform((v) => v.replace(/\/+$/, '')),
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    SESSION_SECRET: z.string().min(32, 'debe tener al menos 32 caracteres'),
    TOKEN_ENCRYPTION_KEY: base64Key,
    PAYMENTS_PROVIDER: z.enum(['mercadopago', 'fake']).default('mercadopago'),
    MP_ACCESS_TOKEN: optional,
    MP_WEBHOOK_SECRET: optional,
    RESEND_API_KEY: optional,
    MAIL_FROM: z.string().default('Boxie <hola@boxiedigital.com.ar>'),
    MAIL_REPLY_TO: optional,
    ADMIN_HOST: optional,
    CRON_SECRET: optional,
    VERCEL_ENV: optional,
    MP_SANDBOX: optional,
  })
  .superRefine((env, ctx) => {
    if (env.PAYMENTS_PROVIDER === 'mercadopago') {
      // Solo el Access Token es obligatorio para el flujo de pago.
      // MP_WEBHOOK_SECRET se valida cuando el endpoint de webhook está activo.
      if (!env.MP_ACCESS_TOKEN)
        ctx.addIssue({
          code: 'custom',
          path: ['MP_ACCESS_TOKEN'],
          message: 'obligatorio con Mercado Pago',
        })
    }
    if (env.VERCEL_ENV === 'production' && env.PAYMENTS_PROVIDER !== 'mercadopago') {
      ctx.addIssue({
        code: 'custom',
        path: ['PAYMENTS_PROVIDER'],
        message: 'en producción solo se admite mercadopago',
      })
    }
  })

export type ServerEnv = z.infer<typeof schema>

let cached: ServerEnv | undefined

export function env(): ServerEnv {
  if (cached) return cached
  const parsed = schema.safeParse(process.env)
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `  · ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(`Variables de entorno inválidas:\n${detail}\nVer .env.example.`)
  }
  cached = parsed.data
  return cached
}

export function siteUrl(path = '/'): string {
  return new URL(path, `${env().NEXT_PUBLIC_SITE_URL}/`).toString()
}
