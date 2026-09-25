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

// -- Argumentos --
const [, , argEmail, argPass, argName, argRole] = process.argv

const EMAIL = (argEmail || 'admin@boxie.demo').toLowerCase().trim()
const PASSWORD = argPass || 'boxie-admin'
const NAME = argName || 'Administrador'
const ROLE = argRole || 'owner'

const VALID_ROLES = ['owner', 'admin', 'editor', 'support']
if (!VALID_ROLES.includes(ROLE)) {
  console.error(`Rol invalido: "${ROLE}". Debe ser uno de: ${VALID_ROLES.join(', ')}`)
  process.exit(1)
}

// -- Helpers de fetch contra la API de Supabase --
const base = SUPABASE_URL.replace(/\/$/, '')

async function supabaseApi(method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = { raw: text }
  }
  return { status: res.status, ok: res.ok, json }
}

// -- Main --
console.log()
console.log('Boxie - Crear administrador')
console.log(`  Proyecto : ${SUPABASE_URL}`)
console.log(`  Email    : ${EMAIL}`)
console.log(`  Nombre   : ${NAME}`)
console.log(`  Rol      : ${ROLE}`)
console.log()

// 1. Verificar si el usuario ya existe en auth.users
console.log('1/3  Verificando si el usuario ya existe en Supabase Auth...')
const listRes = await supabaseApi('GET', `/auth/v1/admin/users?filter=${encodeURIComponent(EMAIL)}`)

let existingUser = null
if (listRes.ok && listRes.json?.users) {
  existingUser = listRes.json.users.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase())
}

let userId

if (existingUser) {
  userId = existingUser.id
  console.log(`     Existe en Auth. UUID: ${userId}`)
  console.log('     Actualizando contrasena...')
  const updRes = await supabaseApi('PUT', `/auth/v1/admin/users/${userId}`, {
    password: PASSWORD,
    email_confirm: true,
  })
  if (!updRes.ok) {
    console.error('No se pudo actualizar la contrasena:', JSON.stringify(updRes.json, null, 2))
    process.exit(1)
  }
  console.log('     Contrasena actualizada OK')
} else {
  // 2. Crear el usuario en Supabase Auth
  console.log('2/3  Creando usuario en Supabase Auth...')
  const createRes = await supabaseApi('POST', '/auth/v1/admin/users', {
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name: NAME },
  })

  if (!createRes.ok) {
    console.error('Error al crear usuario en Auth:')
    console.error(JSON.stringify(createRes.json, null, 2))
    process.exit(1)
  }

  userId = createRes.json.id
  console.log(`     Creado. UUID: ${userId}`)
}

// 3. Insertar / actualizar en public.users
console.log()
console.log('3/3  Insertando en public.users...')

const upsertRes = await fetch(
  `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/users?on_conflict=user_id`,
  {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({
      user_id: userId,
      email: EMAIL,
      name: NAME,
      role: ROLE,
    }),
  },
)
const upsertJson = {
  status: upsertRes.status,
  ok: upsertRes.ok,
  json: await upsertRes.text().then((t) => {
    try {
      return JSON.parse(t)
    } catch {
      return t
    }
  }),
}

if (upsertJson.status === 200 || upsertJson.status === 201 || upsertJson.status === 204) {
  console.log('     Insertado/actualizado en public.users OK')
} else {
  console.error('Error al insertar en public.users:')
  console.error(JSON.stringify(upsertJson.json, null, 2))
  process.exit(1)
}

console.log()
console.log('=== Admin creado correctamente ===')
console.log(`  Email : ${EMAIL}`)
console.log(`  Clave : ${PASSWORD}`)
console.log(`  Rol   : ${ROLE}`)
console.log(`  UUID  : ${userId}`)
console.log()
console.log('  Panel: http://localhost:3000/admin')
console.log()
