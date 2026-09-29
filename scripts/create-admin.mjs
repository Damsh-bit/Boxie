#!/usr/bin/env node
/**
 * Crea el primer administrador de Boxie.
 *
 * Uso:
 *   node scripts/create-admin.mjs [email] [password] [nombre] [rol]
 *
 * Defaults: admin@boxie.demo / boxie-admin / Administrador / owner
 *
 * Requiere en el entorno (o en .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// -- Cargar .env.local manualmente (sin dependencias extra) --
function loadEnv() {
  const paths = ['.env.local', '.env']
  for (const p of paths) {
    try {
      const content = readFileSync(resolve(process.cwd(), p), 'utf8')
      for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eq = trimmed.indexOf('=')
        if (eq === -1) continue
        const key = trimmed.slice(0, eq).trim()
        const val = trimmed.slice(eq + 1).trim()
        if (key && !process.env[key]) {
          process.env[key] = val
        }
      }
      console.log(`V  Variables cargadas desde ${p}`)
      return
    } catch {
      // no existe, siguiente
    }
  }
}

loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.')
  console.error('Asegurate de tener .env.local con esas variables.')
  process.exit(1)
}

// -- Argumentos obligatorios --
const [, , argEmail, argPass, argName, argRole] = process.argv

if (!argEmail || !argPass) {
  console.error('\n❌ Error: Debés proporcionar un email y una contraseña explícitamente.')
  console.error('Uso: node scripts/create-admin.mjs <email> <password> [nombre] [rol]\n')
  console.error('Ejemplo:')
  console.error(
    '  npm run admin:create admin@tudominio.com MiClaveSuperSegura123! "Tu Nombre" owner\n',
  )
  process.exit(1)
}

const EMAIL = argEmail.toLowerCase().trim()
const PASSWORD = argPass.trim()
const NAME = (argName || 'Administrador').trim()
const ROLE = (argRole || 'owner').trim()

// Validaciones de seguridad
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(EMAIL)) {
  console.error(`\n❌ Error: El email "${EMAIL}" no tiene un formato válido.\n`)
  process.exit(1)
}

if (EMAIL.endsWith('@boxie.demo')) {
  console.error(
    '\n❌ Error de seguridad: No se permite crear administradores con dominio de demo (@boxie.demo).',
  )
  console.error('Utilizá un correo corporativo o personal real.\n')
  process.exit(1)
}

if (PASSWORD.length < 12) {
  console.error('\n❌ Error de seguridad: La contraseña debe tener al menos 12 caracteres.')
  console.error('Utilizá una contraseña robusta con letras, números y símbolos.\n')
  process.exit(1)
}

if (
  PASSWORD.toLowerCase().includes('boxie-admin') ||
  PASSWORD.toLowerCase() === 'admin' ||
  PASSWORD.toLowerCase() === 'password' ||
  PASSWORD.toLowerCase() === '12345678'
) {
  console.error(
    '\n❌ Error de seguridad: No podés utilizar la clave por defecto de demo ("boxie-admin") ni claves triviales.\n',
  )
  process.exit(1)
}

const VALID_ROLES = ['owner', 'admin', 'editor', 'support']
if (!VALID_ROLES.includes(ROLE)) {
  console.error(`\n❌ Rol inválido: "${ROLE}". Debe ser uno de: ${VALID_ROLES.join(', ')}\n`)
  process.exit(1)
}

// -- Helpers de fetch contra la API de Supabase --
const base = SUPABASE_URL.replace(/\/$/, '')

import { randomBytes, scryptSync } from 'node:crypto'

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

// -- Main --
console.log()
console.log('Boxie - Crear administrador (public.users)')
console.log(`  Proyecto : ${SUPABASE_URL}`)
console.log(`  Email    : ${EMAIL}`)
console.log(`  Nombre   : ${NAME}`)
console.log(`  Rol      : ${ROLE}`)
console.log()

const passwordHash = hashPassword(PASSWORD)

// 1. Verificar si el usuario ya existe en public.users
console.log('1/2  Verificando en public.users...')
const checkRes = await fetch(
  `${base}/rest/v1/users?email=ilike.${encodeURIComponent(EMAIL)}&select=user_id,email`,
  {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  },
)
const existingUsers = checkRes.ok ? await checkRes.json() : []
const existing = Array.isArray(existingUsers) && existingUsers.length > 0 ? existingUsers[0] : null

let userId

if (existing) {
  userId = existing.user_id
  console.log(`     Usuario encontrado (UUID: ${userId}). Actualizando clave y rol...`)
  const updateRes = await fetch(`${base}/rest/v1/users?user_id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      name: NAME,
      role: ROLE,
      password_hash: passwordHash,
    }),
  })
  if (!updateRes.ok) {
    console.error('Error al actualizar en public.users:', await updateRes.text())
    process.exit(1)
  }
  console.log('     Actualizado OK')
} else {
  console.log('2/2  Insertando nuevo usuario en public.users...')
  const insertRes = await fetch(`${base}/rest/v1/users`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      email: EMAIL,
      name: NAME,
      role: ROLE,
      password_hash: passwordHash,
    }),
  })
  if (!insertRes.ok) {
    console.error('Error al insertar en public.users:', await insertRes.text())
    process.exit(1)
  }
  const inserted = await insertRes.json()
  userId = inserted[0]?.user_id
  console.log(`     Creado OK (UUID: ${userId})`)
}

console.log()
console.log('=== Admin listo en la tabla public.users ===')
console.log(`  Email : ${EMAIL}`)
console.log('  Clave : [Configurada de forma segura]')
console.log(`  Rol   : ${ROLE}`)
console.log(`  UUID  : ${userId}`)
console.log()
console.log('  Panel: http://localhost:3000/admin')
console.log()
