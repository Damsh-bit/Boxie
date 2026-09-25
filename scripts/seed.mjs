#!/usr/bin/env node
/**
 * Boxie · Data Seeder para Demo y Desarrollo
 *
 * Puebla la base de datos de Supabase con datos ficticios realistas para trabajar
 * y presentar la demo completa:
 *  - Configuración general del negocio (settings)
 *  - Planes de precios (Esencial, Clásica, Premium)
 *  - Afiliados con códigos y comisiones
 *  - Cupones de descuento
 *  - Usuarios del equipo (owner, admin, editor, support) y clientes de prueba
 *  - Gastos operativos y fijos (infraestructura, marketing, equipo, etc.)
 *  - Tablero Kanban de tareas
 *  - Bitácora de auditoría (audit log)
 *  - Historial de órdenes de compra con eventos de pago
 *  - Boxies activas, bloqueadas y abiertas con tokens cifrados (AES-256-GCM)
 *  - Contenido de slides en boxie_content
 *
 * Uso:
 *   node scripts/seed.mjs
 *   npm run db:seed
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createCipheriv, createHash, randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

// ── Cargar variables de entorno ──────────────────────────────────────────────

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
      return p
    } catch {
      // archivo no existe, siguiente
    }
  }
  return null
}

const envFile = loadEnv()
if (envFile) {
  console.log(`📦 Variables de entorno cargadas desde ${envFile}`)
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TOKEN_KEY = process.env.TOKEN_ENCRYPTION_KEY || 'MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE='

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    '❌ Error: Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.',
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const isClean = process.argv.includes('--clean') || process.argv.includes('--reset')

// ── Tokens y Criptografía ───────────────────────────────────────────────────

function generateToken() {
  return randomBytes(24).toString('base64url')
}

function hashToken(token) {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

function encryptToken(token, keyBase64) {
  const key = Buffer.from(keyBase64, 'base64')
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1.${Buffer.concat([iv, tag, ciphertext]).toString('base64url')}`
}

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
function generateCode(usedSet) {
  let code = ''
  do {
    code = Array.from(
      { length: 8 },
      () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)],
    ).join('')
  } while (usedSet.has(code))
  usedSet.add(code)
  return code
}

// ── Generador Pseudo-Aleatorio y Fechas Argentina ─────────────────────────────

function randomBetween(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function chance(prob) {
  return Math.random() < prob
}

/** Genera una fecha con hora comercial realista de Argentina (UTC-3) */
function makeArgentineDate(daysAgo) {
  const now = new Date()
  // Offset a fecha en Argentina
  const target = new Date(now.getTime() - daysAgo * 86_400_000 - 3 * 3600_000)
  const year = target.getUTCFullYear()
  const month = String(target.getUTCMonth() + 1).padStart(2, '0')
  const day = String(target.getUTCDate()).padStart(2, '0')

  // Horario entre las 09:00 y las 23:30 (horario activo de compras)
  const hour = String(randomBetween(9, 23)).padStart(2, '0')
  const minute = String(randomBetween(0, 59)).padStart(2, '0')
  const second = String(randomBetween(0, 59)).padStart(2, '0')

  // String con huso horario explícito de Argentina (-03:00)
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}-03:00`)
}

// ── Datos Ficticios ─────────────────────────────────────────────────────────

const NOMBRES = [
  'Sofía Gómez',
  'Lucas Benítez',
  'Valentina Silva',
  'Mateo Castro',
  'Camila Ruiz',
  'Joaquín Herrera',
  'Lucía Fernández',
  'Tomás Romero',
  'Julieta Díaz',
  'Nicolás Pérez',
  'Martina Martínez',
  'Agustín Medina',
  'Florencia Sosa',
  'Federico Álvarez',
  'Rocío Torres',
  'Santiago López',
  'Paula Ramírez',
  'Bruno Acosta',
  'Carolina Suárez',
  'Matías Morales',
]

const DESTINATARIOS = [
  'Sofi',
  'Mica',
  'Juli',
  'Cami',
  'Flor',
  'Agus',
  'Vale',
  'Lu',
  'Mati',
  'Tomi',
  'Nico',
  'Juan',
  'Fede',
  'Mamá',
  'Papá',
  'Abu',
  'Mi amor',
  'Gordi',
  'Chula',
  'Martu',
  'Rochi',
  'Santi',
]

// ── Seed Execution ──────────────────────────────────────────────────────────

async function runSeed() {
  console.log('\n========================================')
  console.log('✨  Boxie · Sembrando datos ficticios')
  console.log('========================================\n')

  // 1. Configuración (settings)
  console.log('⚙️  Actualizando configuración de negocio...')
  const { error: errSettings } = await supabase
    .from('settings')
    .update({
      monthly_goal_cents: 2_500_000_00, // $2.500.000 ARS
      gateway_fee_bps: 629, // 6,29%
      gateway_vat_bps: 2100, // 21%
      gateway_fixed_cents: 0,
      tax_bps: 350, // 3,5% IIBB
      variable_cost_cents: 2500, // $25 costo x boxie
      business_name: 'Boxie Digital',
      support_email: 'ayuda@boxiedigital.com.ar',
      whatsapp: '+54 9 11 5555-0100',
      instagram: '@boxie.app',
      sales_paused: false,
    })
    .eq('id', true)

  if (errSettings) {
    console.warn('⚠️  No se pudo actualizar settings:', errSettings.message)
  } else {
    console.log('✔  Configuración de negocio actualizada')
  }

  // 2. Planes (plans)
  console.log('\n💳  Cargando planes de precios...')
  const plansData = [
    {
      id: 'b0a1e7f4-1c2d-4e5f-8a9b-000000000001',
      slug: 'esencial',
      name: 'Esencial',
      tagline: 'Lo justo para emocionar',
      price_cents: 349_000, // $3.490
      compare_at_cents: 599_000,
      rank: 1,
      color: '#73CFEE',
      features: ['Link para compartir por WhatsApp', 'Editás hasta regalarla', '5 fotos incluidas'],
      gift_lifetime_days: 30,
      max_photos: 5,
      allow_password: false,
      highlighted: false,
      active: true,
    },
    {
      id: 'b0a1e7f4-1c2d-4e5f-8a9b-000000000002',
      slug: 'clasica',
      name: 'Clásica',
      tagline: 'La experiencia completa, con juegos',
      price_cents: 499_000, // $4.990
      compare_at_cents: 899_000,
      rank: 2,
      color: '#F44E63',
      features: [
        'Trivia, tragamonedas y cuponera',
        'Tapa de revista y anécdota',
        '15 fotos incluidas',
        'Clave de acceso',
      ],
      gift_lifetime_days: 60,
      max_photos: 15,
      allow_password: true,
      highlighted: true,
      active: true,
    },
    {
      id: 'b0a1e7f4-1c2d-4e5f-8a9b-000000000003',
      slug: 'premium',
      name: 'Premium',
      tagline: 'Todo, para un regalo inolvidable',
      price_cents: 799_000, // $7.990
      compare_at_cents: 1_299_000,
      rank: 3,
      color: '#C893D7',
      features: [
        'Todas las pantallas: playlists, streaming y reflexiones',
        'Soporte prioritario por WhatsApp',
        '30 fotos de alta calidad',
        '120 días de vigencia online',
      ],
      gift_lifetime_days: 120,
      max_photos: 30,
      allow_password: true,
      highlighted: false,
      active: true,
    },
  ]

  for (const plan of plansData) {
    const { error } = await supabase.from('plans').upsert(plan, { onConflict: 'slug' })
    if (error) console.warn(`⚠️  Plan ${plan.slug}:`, error.message)
  }
  console.log(`✔  ${plansData.length} planes registrados (Esencial, Clásica, Premium)`)

  // 3. Afiliados (affiliates)
  console.log('\n🤝  Cargando afiliados...')
  const affiliatesData = [
    {
      id: 'e1a1e7f4-1c2d-4e5f-8a9b-000000000001',
      name: 'Colaboraciones con creadoras',
      code: 'INFLUENCERS',
      commission_bps: 0,
      active: true,
      email: 'colaboraciones@boxie.demo',
      notes: 'Canje: la creadora recibe Boxies gratis a cambio de contenido.',
    },
    {
      id: 'e1a1e7f4-1c2d-4e5f-8a9b-000000000002',
      name: 'Sofi Deco (Instagram)',
      code: 'SOFI',
      commission_bps: 1500, // 15%
      active: true,
      email: 'sofideco@boxie.demo',
      notes: 'Comisión del 15% por venta con su código. Se liquida el 5 de cada mes.',
    },
    {
      id: 'e1a1e7f4-1c2d-4e5f-8a9b-000000000003',
      name: 'Florería Las Violetas',
      code: 'VIOLETAS',
      commission_bps: 1000, // 10%
      active: false,
      email: 'violetas@boxie.demo',
      notes: 'Prueba piloto presencial (pausada).',
    },
  ]

  for (const aff of affiliatesData) {
    const { error } = await supabase.from('affiliates').upsert(aff, { onConflict: 'code' })
    if (error) console.warn(`⚠️  Afiliado ${aff.code}:`, error.message)
  }
  console.log(`✔  ${affiliatesData.length} afiliados registrados`)

  // 4. Cupones (coupons)
  console.log('\n🏷️  Cargando cupones de descuento...')
  const couponsData = [
    {
      id: '49456f9e-734d-409a-be1e-f5501efad4c5',
      code: 'BOXIE10',
      kind: 'percent',
      value: 10,
      active: true,
      description: 'Bienvenida: la home lo ofrece a todos los visitantes.',
    },
    {
      id: 'ce2fff85-8e5b-4baf-a3f3-2d67b4a38a13',
      code: 'PAREJA20',
      kind: 'percent',
      value: 20,
      active: true,
      description: 'Campaña de aniversarios y parejas.',
    },
    {
      id: 'ed7f34e6-fb74-4cba-9406-9bc24d058c38',
      code: 'INFLUENCER50',
      kind: 'percent',
      value: 50,
      active: true,
      max_uses: 150,
      affiliate_id: 'e1a1e7f4-1c2d-4e5f-8a9b-000000000001',
      description: 'Sorteos y colaboraciones con creadoras.',
    },
    {
      id: '960ff84d-420c-4bbd-bb73-d9d19f9bda31',
      code: 'LOQUIEROYA25',
      kind: 'percent',
      value: 25,
      active: true,
      description: 'Oferta de urgencia emergente en la ficha.',
    },
    {
      id: 'c755be91-dfcb-49a5-8889-244fa7702771',
      code: 'PROMO35',
      kind: 'percent',
      value: 35,
      active: false,
      expires_at: '2026-03-01T03:00:00.000Z',
      description: 'Campaña de San Valentín (finalizada).',
    },
    {
      id: 'd1a1e7f4-1c2d-4e5f-8a9b-000000000006',
      code: 'SOFI10',
      kind: 'percent',
      value: 10,
      active: true,
      max_uses: 300,
      affiliate_id: 'e1a1e7f4-1c2d-4e5f-8a9b-000000000002',
      description: 'Código de influencer Sofi Deco.',
    },
    {
      id: 'd1a1e7f4-1c2d-4e5f-8a9b-000000000007',
      code: 'MAMA15',
      kind: 'percent',
      value: 15,
      active: true,
      starts_at: '2026-10-01T03:00:00.000Z',
      expires_at: '2026-10-19T03:00:00.000Z',
      description: 'Especial Día de la Madre.',
    },
  ]

  for (const c of couponsData) {
    const { error } = await supabase.from('coupons').upsert(c, { onConflict: 'code' })
    if (error) console.warn(`⚠️  Cupón ${c.code}:`, error.message)
  }
  console.log(`✔  ${couponsData.length} cupones registrados`)

  // 5. Usuarios (auth.users + public.users)
  console.log('\n👥  Configurando equipo y usuarios de prueba...')
  const teamUsers = [
    {
      email: 'admin@boxie.demo',
      password: 'boxie-admin',
      name: 'Administrador',
      role: 'owner',
      phone: '+54 9 11 5555-0101',
    },
    {
      email: 'socio@boxie.demo',
      password: 'boxie-socio',
      name: 'Santiago Martínez',
      role: 'admin',
      phone: '+54 9 11 5555-0102',
    },
    {
      email: 'soporte@boxie.demo',
      password: 'boxie-soporte',
      name: 'Lucía Fernández',
      role: 'support',
      phone: '+54 9 11 5555-0103',
    },
    {
      email: 'contenido@boxie.demo',
      password: 'boxie-contenido',
      name: 'Martín Gómez',
      role: 'editor',
      phone: '+54 9 11 5555-0104',
    },
    {
      email: 'sofia.lopez@ejemplo.com',
      password: 'boxie-demo-123',
      name: 'Sofía López',
      role: null, // Cliente común
      phone: '+54 9 11 4444-1122',
    },
    {
      email: 'fede.diaz@ejemplo.com',
      password: 'boxie-demo-123',
      name: 'Federico Díaz',
      role: null, // Cliente común
      phone: '+54 9 11 4444-3344',
    },
  ]

  const { data: existingAuth } = await supabase.auth.admin.listUsers()
  const authMap = new Map((existingAuth?.users || []).map((u) => [u.email.toLowerCase(), u.id]))

  for (const u of teamUsers) {
    let userId = authMap.get(u.email.toLowerCase())
    if (!userId) {
      const { data: newUser, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { name: u.name },
      })
      if (error) {
        console.warn(`⚠️  No se pudo crear en Auth ${u.email}:`, error.message)
        continue
      }
      userId = newUser.user.id
      authMap.set(u.email.toLowerCase(), userId)
    }

    const { error: errUser } = await supabase.from('users').upsert(
      {
        user_id: userId,
        email: u.email,
        name: u.name,
        role: u.role,
        phone: u.phone,
        is_active: true,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    if (errUser) console.warn(`⚠️  Error en tabla users para ${u.email}:`, errUser.message)
  }
  console.log(`✔  ${teamUsers.length} usuarios verificados en equipo y clientes`)

  // 6. Gastos (expenses)
  console.log('\n💸  Cargando gastos operativos...')
  const expensesData = [
    {
      id: 'f1a1e7f4-1c2d-4e5f-8a9b-000000000001',
      category: 'infraestructura',
      description: 'Hosting y funciones edge',
      vendor: 'Vercel Pro',
      amount_cents: 24_000_00,
      recurrence: 'monthly',
      starts_on: '2025-09-01',
    },
    {
      id: 'f1a1e7f4-1c2d-4e5f-8a9b-000000000002',
      category: 'infraestructura',
      description: 'Base de datos PostgreSQL y Storage',
      vendor: 'Supabase Pro',
      amount_cents: 30_000_00,
      recurrence: 'monthly',
      starts_on: '2025-10-01',
    },
    {
      id: 'f1a1e7f4-1c2d-4e5f-8a9b-000000000003',
      category: 'infraestructura',
      description: 'Mails transaccionales',
      vendor: 'Resend',
      amount_cents: 18_000_00,
      recurrence: 'monthly',
      starts_on: '2025-10-01',
    },
    {
      id: 'f1a1e7f4-1c2d-4e5f-8a9b-000000000004',
      category: 'infraestructura',
      description: 'Dominio boxiedigital.com.ar',
      vendor: 'NIC Argentina',
      amount_cents: 16_000_00,
      recurrence: 'once',
      starts_on: '2025-09-01',
    },
    {
      id: 'f1a1e7f4-1c2d-4e5f-8a9b-000000000005',
      category: 'marketing',
      description: 'Campañas de Instagram y Meta Ads',
      vendor: 'Meta Ads',
      amount_cents: 320_000_00,
      recurrence: 'monthly',
      starts_on: '2025-09-01',
    },
    {
      id: 'f1a1e7f4-1c2d-4e5f-8a9b-000000000006',
      category: 'marketing',
      description: 'Búsquedas en Google "regalo digital original"',
      vendor: 'Google Ads',
      amount_cents: 110_000_00,
      recurrence: 'monthly',
      starts_on: '2026-02-01',
    },
    {
      id: 'f1a1e7f4-1c2d-4e5f-8a9b-000000000007',
      category: 'marketing',
      description: 'Diseño de piezas y reels para Instagram',
      vendor: 'Diseñadora freelance',
      amount_cents: 180_000_00,
      recurrence: 'monthly',
      starts_on: '2026-01-01',
    },
    {
      id: 'f1a1e7f4-1c2d-4e5f-8a9b-000000000008',
      category: 'herramientas',
      description: 'Plantillas y diseño',
      vendor: 'Canva Pro',
      amount_cents: 9_500_00,
      recurrence: 'monthly',
      starts_on: '2025-09-01',
    },
    {
      id: 'f1a1e7f4-1c2d-4e5f-8a9b-000000000009',
      category: 'impuestos',
      description: 'Monotributo impositivo y previsional',
      vendor: 'ARCA / AFIP',
      amount_cents: 62_000_00,
      recurrence: 'monthly',
      starts_on: '2025-09-01',
    },
    {
      id: 'f1a1e7f4-1c2d-4e5f-8a9b-000000000010',
      category: 'equipo',
      description: 'Honorarios contables mensuales',
      vendor: 'Estudio Contable',
      amount_cents: 55_000_00,
      recurrence: 'monthly',
      starts_on: '2025-11-01',
    },
  ]

  for (const exp of expensesData) {
    const { error } = await supabase.from('expenses').upsert(exp, { onConflict: 'id' })
    if (error) console.warn(`⚠️  Gasto ${exp.vendor}:`, error.message)
  }
  console.log(`✔  ${expensesData.length} gastos fijos y variables guardados`)

  // 7. Tareas Kanban (admin_tasks)
  console.log('\n📋  Cargando tareas del tablero Kanban...')
  const now = new Date()
  const inDays = (d) => new Date(now.getTime() + d * 86_400_000).toISOString().slice(0, 10)

  const tasksData = [
    {
      id: 'a1b1e7f4-1c2d-4e5f-8a9b-000000000001',
      title: 'Validar webhook de Mercado Pago en producción',
      description:
        'Comprobar que los webhooks con firmas secretas impacten correctamente en tiempo real.',
      status: 'doing',
      priority: 'alta',
      assignee: 'socio@boxie.demo',
      tags: ['pagos', 'infra'],
      due_on: inDays(5),
      position: 0,
    },
    {
      id: 'a1b1e7f4-1c2d-4e5f-8a9b-000000000002',
      title: 'Lanzar campaña especial Día de la Madre',
      description: 'Revisar cupón MAMA15 y coordinar pauta en Meta Ads con fotos de prueba.',
      status: 'doing',
      priority: 'alta',
      assignee: 'admin@boxie.demo',
      tags: ['marketing'],
      due_on: inDays(12),
      position: 1,
    },
    {
      id: 'a1b1e7f4-1c2d-4e5f-8a9b-000000000003',
      title: 'Preparar temática Navidad y Año Nuevo',
      description: 'Diseñar la paleta festiva y armar las preguntas de la trivia familiar.',
      status: 'todo',
      priority: 'media',
      assignee: 'contenido@boxie.demo',
      tags: ['temáticas'],
      due_on: inDays(45),
      position: 0,
    },
    {
      id: 'a1b1e7f4-1c2d-4e5f-8a9b-000000000004',
      title: 'Revisar reseñas de clientes destacados',
      description:
        'Pedir permiso a compradores con comentarios positivos para la página de inicio.',
      status: 'todo',
      priority: 'baja',
      assignee: 'soporte@boxie.demo',
      tags: ['soporte', 'marketing'],
      due_on: null,
      position: 1,
    },
    {
      id: 'a1b1e7f4-1c2d-4e5f-8a9b-000000000005',
      title: 'Actualizar beneficios del plan Clásica',
      description: 'Incrementar el cupo de fotos a 15 y habilitar pantalla de cuponera.',
      status: 'done',
      priority: 'media',
      assignee: 'admin@boxie.demo',
      tags: ['planes'],
      due_on: null,
      position: 0,
    },
    {
      id: 'a1b1e7f4-1c2d-4e5f-8a9b-000000000006',
      title: 'Configurar base de datos Supabase y credenciales',
      description: 'Aplicar migraciones y unificar tabla de perfiles de usuario.',
      status: 'done',
      priority: 'alta',
      assignee: 'socio@boxie.demo',
      tags: ['infra'],
      due_on: null,
      position: 1,
    },
  ]

  for (const t of tasksData) {
    const { error } = await supabase.from('admin_tasks').upsert(t, { onConflict: 'id' })
    if (error) console.warn(`⚠️  Tarea ${t.title}:`, error.message)
  }
  console.log(`✔  ${tasksData.length} tareas cargadas en el Kanban`)

  // 8. Bitácora de auditoría (admin_audit_log)
  console.log('\n📜  Registrando eventos en la bitácora de auditoría...')
  const auditEntries = [
    {
      actor_email: 'admin@boxie.demo',
      action: 'plan.update',
      entity: 'plan',
      entity_id: 'b0a1e7f4-1c2d-4e5f-8a9b-000000000002',
      summary: 'Actualizó los beneficios del plan Clásica',
    },
    {
      actor_email: 'socio@boxie.demo',
      action: 'settings.update',
      entity: 'settings',
      entity_id: null,
      summary: 'Ajustó la meta mensual a $2.500.000 ARS',
    },
    {
      actor_email: 'soporte@boxie.demo',
      action: 'boxie.resend',
      entity: 'boxie',
      entity_id: null,
      summary: 'Reenvió el link del editor a comprador por WhatsApp',
    },
    {
      actor_email: 'admin@boxie.demo',
      action: 'coupon.create',
      entity: 'coupon',
      entity_id: 'd1a1e7f4-1c2d-4e5f-8a9b-000000000007',
      summary: 'Creó el cupón programado MAMA15 para el Día de la Madre',
    },
    {
      actor_email: 'contenido@boxie.demo',
      action: 'theme.publish',
      entity: 'theme',
      entity_id: 'a46e94ab-6846-429b-a057-63d830f5e97e',
      summary: 'Publicó versión actualizada de la temática Pareja',
    },
  ]

  // Verificar si ya hay logs para no sobrepoblar
  const { count: auditCount } = await supabase
    .from('admin_audit_log')
    .select('*', { count: 'exact', head: true })
  if (!auditCount || auditCount < 5) {
    for (const a of auditEntries) {
      await supabase.from('admin_audit_log').insert(a)
    }
    console.log(`✔  ${auditEntries.length} eventos insertados en la bitácora`)
  } else {
    console.log(`✔  Bitácora ya contiene ${auditCount} eventos`)
  }

  // 9. Órdenes, Pagos y Boxies
  console.log('\n🎁  Generando historial de ventas, órdenes y Boxies...')

  // Obtener temáticas reales
  const { data: themes } = await supabase
    .from('themes')
    .select('id, slug, name, current_version_id')
  if (!themes || themes.length === 0) {
    console.error('❌ No se encontraron temáticas en la base de datos.')
    process.exit(1)
  }

  const validThemes = themes.filter((t) => t.current_version_id)
  console.log(`  Temáticas disponibles: ${validThemes.map((t) => t.slug).join(', ')}`)

  const usedCodes = new Set()
  const { count: existingCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })

  if (isClean) {
    console.log('🧹  Modo --clean activado: limpiando órdenes y boxies previas...')
    await supabase
      .from('boxie_content')
      .delete()
      .neq('boxie_id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('boxies').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('payment_events').delete().gt('id', 0)
    await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    console.log('✔  Datos de órdenes previas eliminados correctamente')
  } else if ((existingCount || 0) > 0) {
    console.log(`ℹ️  Ya existen ${existingCount} órdenes en la base de datos.`)
    console.log('   Para evitar duplicar información, no se generaron nuevas ventas.')
    console.log('   💡 Si querés reiniciar y regenerar las ventas desde cero, ejecutá:')
    console.log('      npm run db:seed -- --clean\n')
    console.log('========================================')
    console.log('🎉  ¡Seeding finalizado con éxito!')
    console.log('========================================\n')
    return
  }

  // Generamos ~55 órdenes distribuidas en los últimos 45 días
  const TOTAL_ORDERS = 55
  let createdOrders = 0
  let createdBoxies = 0

  for (let i = 0; i < TOTAL_ORDERS; i++) {
    // Fecha distribuida (más ventas hacia los días recientes) con hora comercial argentina
    const daysBack = Math.pow(Math.random(), 1.5) * 45
    const orderDate = makeArgentineDate(daysBack)

    const buyerName = randomItem(NOMBRES)
    const [firstName, lastName] = buyerName.split(' ')
    const buyerEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomBetween(10, 99)}@ejemplo.com`
    const buyerPhone = `+54 9 11 ${randomBetween(3000, 9999)}-${randomBetween(1000, 9999)}`

    const theme = randomItem(validThemes)
    const plan = randomItem(plansData)

    // Decidir cupón aplicado (25% chance)
    let coupon = null
    let discountCents = 0
    if (chance(0.25)) {
      const activeCoupons = couponsData.filter((c) => c.active && c.code !== 'MAMA15')
      coupon = randomItem(activeCoupons)
      discountCents = Math.round((plan.price_cents * coupon.value) / 100)
    }

    const listPriceCents = plan.price_cents
    const amountCents = listPriceCents - discountCents

    // Estado de la orden: 80% paid, 10% pending, 5% cancelled, 5% refunded
    const roll = Math.random()
    let status = 'paid'
    let providerStatus = 'approved'
    let paidAt = new Date(orderDate.getTime() + randomBetween(2, 25) * 60_000)

    if (roll > 0.95) {
      status = 'refunded'
      providerStatus = 'approved'
    } else if (roll > 0.9) {
      status = 'cancelled'
      providerStatus = 'cancelled'
      paidAt = null
    } else if (roll > 0.8) {
      status = 'pending'
      providerStatus = 'pending'
      paidAt = null
    }

    const mpPaymentId = paidAt ? `${randomBetween(10000000000, 99999999999)}` : null

    // Insertar orden
    const { data: order, error: errOrder } = await supabase
      .from('orders')
      .insert({
        status,
        theme_id: theme.id,
        theme_version_id: theme.current_version_id,
        plan_id: plan.id,
        currency: 'ARS',
        list_price_cents: listPriceCents,
        discount_cents: discountCents,
        amount_cents: amountCents,
        coupon_id: coupon ? coupon.id : null,
        coupon_code: coupon ? coupon.code : null,
        affiliate_id: coupon?.affiliate_id || null,
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        buyer_phone: buyerPhone,
        payment_provider: 'mercadopago',
        mp_payment_id: mpPaymentId,
        provider_status: providerStatus,
        paid_at: paidAt ? paidAt.toISOString() : null,
        created_at: orderDate.toISOString(),
        updated_at: (paidAt || orderDate).toISOString(),
      })
      .select('id')
      .single()

    if (errOrder || !order) {
      console.warn('⚠️  Error al crear orden:', errOrder?.message)
      continue
    }
    createdOrders++

    // Eventos de pago asociados
    if (paidAt) {
      await supabase.from('payment_events').insert({
        order_id: order.id,
        provider: 'mercadopago',
        provider_payment_id: mpPaymentId,
        status: 'approved',
        source: chance(0.5) ? 'webhook' : 'return',
        outcome: 'paid',
        received_at: paidAt.toISOString(),
      })
    }

    // Crear Boxie si la orden fue pagada o reembolsada
    if (status === 'paid' || status === 'refunded') {
      const code = generateCode(usedCodes)
      const rawGiftToken = generateToken()
      const rawEditToken = generateToken()

      const giftHash = hashToken(rawGiftToken)
      const giftEnc = encryptToken(rawGiftToken, TOKEN_KEY)
      const editHash = hashToken(rawEditToken)

      const recipientName = randomItem(DESTINATARIOS)
      const senderName = firstName

      // Tiempos de ciclo de vida de la Boxie
      const isLocked = chance(0.75)
      const lockedAt = isLocked
        ? new Date(paidAt.getTime() + randomBetween(1, 48) * 3600_000)
        : null

      const isOpened = isLocked && chance(0.85)
      const firstOpenedAt = isOpened
        ? new Date(lockedAt.getTime() + randomBetween(1, 24) * 3600_000)
        : null
      const openCount = isOpened ? randomBetween(1, 12) : 0

      // Vencimiento según plan (30, 60 o 120 días desde el pago)
      const expiresAt = new Date(paidAt.getTime() + plan.gift_lifetime_days * 86_400_000)

      const boxieStatus =
        status === 'refunded' ? 'refunded' : expiresAt < now ? 'expired' : 'active'

      const { data: boxie, error: errBoxie } = await supabase
        .from('boxies')
        .insert({
          code,
          order_id: order.id,
          theme_version_id: theme.current_version_id,
          status: boxieStatus,
          gift_token_hash: giftHash,
          gift_token_enc: giftEnc,
          edit_token_hash: editHash,
          recipient_name: recipientName,
          sender_name: senderName,
          locked_at: lockedAt ? lockedAt.toISOString() : null,
          expires_at: expiresAt.toISOString(),
          first_opened_at: firstOpenedAt ? firstOpenedAt.toISOString() : null,
          open_count: openCount,
          created_at: paidAt.toISOString(),
          updated_at: (lockedAt || paidAt).toISOString(),
        })
        .select('id')
        .single()

      if (errBoxie || !boxie) {
        console.warn('⚠️  Error al crear boxie:', errBoxie?.message)
        continue
      }
      createdBoxies++

      // Cargar contenido de slides de prueba para algunas boxies
      if (isLocked) {
        await supabase.from('boxie_content').insert([
          {
            boxie_id: boxie.id,
            slide_key: 'cover.recipient',
            props: {
              title: `¡Feliz día, ${recipientName}!`,
              subtitle: 'De parte de ' + senderName,
            },
          },
          {
            boxie_id: boxie.id,
            slide_key: 'story.dedication',
            props: {
              text: 'Gracias por estar siempre en cada momento importante. ¡Espero que disfrutes mucho este regalo!',
            },
          },
          {
            boxie_id: boxie.id,
            slide_key: 'media.song',
            props: { title: 'Nuestra canción favorita', artist: 'Artista demo' },
          },
        ])
      }
    }
  }

  console.log(`✔  ${createdOrders} órdenes de compra creadas`)
  console.log(`✔  ${createdBoxies} Boxies registradas con códigos y tokens criptográficos`)
  console.log(`✔  Contenido en boxie_content cargado para boxies completadas`)

  console.log('\n========================================')
  console.log('🚀  ¡Base de datos demo lista para trabajar!')
  console.log('   Panel disponible en: http://localhost:3000/admin')
  console.log('========================================\n')
}

runSeed().catch((err) => {
  console.error('\n❌ Error durante el seed:', err)
  process.exit(1)
})
