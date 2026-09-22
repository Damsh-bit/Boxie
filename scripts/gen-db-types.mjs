#!/usr/bin/env node
/**
 * Genera src/server/db/database.types.ts a partir de las migraciones, con el
 * mismo formato que `supabase gen types typescript`.
 *
 * Aplica supabase/migrations/*.sql sobre un Postgres embebido (PGlite) con el
 * shim de Supabase de los tests, e introspecciona el catálogo. No necesita
 * Docker ni un proyecto remoto. Con el stack local levantado, el comando
 * oficial (`npm run db:types`) produce un resultado equivalente.
 *
 *   node scripts/gen-db-types.mjs           escribe el archivo
 *   node scripts/gen-db-types.mjs --check   falla si está desactualizado (CI)
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

const ROOT = join(import.meta.dirname, '..')
const OUT = join(ROOT, 'src', 'server', 'db', 'database.types.ts')
const SCHEMA = 'public'

const pg = await PGlite.create({ extensions: { pgcrypto } })
await pg.exec(readFileSync(join(ROOT, 'tests', 'db', 'supabase-shim.sql'), 'utf8'))
for (const f of readdirSync(join(ROOT, 'supabase', 'migrations')).filter((f) => f.endsWith('.sql')).sort()) {
  await pg.exec(readFileSync(join(ROOT, 'supabase', 'migrations', f), 'utf8'))
}

const q = async (sql, params = []) => (await pg.query(sql, params)).rows

const enums = await q(
  `select t.typname as name, array_agg(e.enumlabel order by e.enumsortorder) as labels
     from pg_type t join pg_enum e on e.enumtypid = t.oid
     join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = $1 group by t.typname order by t.typname`,
  [SCHEMA],
)
const enumNames = new Set(enums.map((e) => e.name))

function tsType(udt, isArray = false) {
  if (isArray || udt.startsWith('_')) return `${tsType(udt.replace(/^_/, ''))}[]`
  if (enumNames.has(udt)) return `Database["public"]["Enums"]["${udt}"]`
  switch (udt) {
    case 'int2': case 'int4': case 'int8': case 'float4': case 'float8': case 'numeric':
      return 'number'
    case 'bool':
      return 'boolean'
    case 'json': case 'jsonb':
      return 'Json'
    case 'void':
      return 'undefined'
    default:
      return 'string'
  }
}

const tables = await q(
  `select c.relname as name, c.relkind as kind
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = $1 and c.relkind in ('r', 'v', 'm') order by c.relname`,
  [SCHEMA],
)

const columns = await q(
  `select c.table_name, c.column_name, c.udt_name, c.is_nullable = 'YES' as nullable,
          c.column_default is not null as has_default, c.is_identity = 'YES' as is_identity,
          c.identity_generation, c.is_generated = 'ALWAYS' as is_generated, c.ordinal_position
     from information_schema.columns c
    where c.table_schema = $1 order by c.table_name, c.ordinal_position`,
  [SCHEMA],
)

const fks = await q(
  `select con.conname as name, rel.relname as table_name, frel.relname as ref_table,
          (select array_agg(a.attname order by k.ord) from unnest(con.conkey) with ordinality k(attnum, ord)
             join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum) as cols,
          (select array_agg(a.attname order by k.ord) from unnest(con.confkey) with ordinality k(attnum, ord)
             join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k.attnum) as ref_cols
     from pg_constraint con
     join pg_class rel on rel.oid = con.conrelid
     join pg_class frel on frel.oid = con.confrelid
     join pg_namespace n on n.oid = rel.relnamespace
     join pg_namespace fn on fn.oid = frel.relnamespace
    where con.contype = 'f' and n.nspname = $1 and fn.nspname = $1
    order by rel.relname, con.conname`,
  [SCHEMA],
)

// Un FK es 1-a-1 si sus columnas son exactamente una clave única de la tabla.
const uniques = await q(
  `select rel.relname as table_name,
          (select array_agg(a.attname order by a.attname) from unnest(con.conkey) k(attnum)
             join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum) as cols
     from pg_constraint con join pg_class rel on rel.oid = con.conrelid
     join pg_namespace n on n.oid = rel.relnamespace
    where con.contype in ('u', 'p') and n.nspname = $1`,
  [SCHEMA],
)
const isOneToOne = (table, cols) =>
  uniques.some((u) => u.table_name === table && [...u.cols].sort().join() === [...cols].sort().join())

const functions = await q(
  `select p.proname as name, p.proretset as returns_set, p.prorettype::regtype::text as ret_type,
          rt.typname as ret_udt, rt.typtype as ret_typtype, rt.typrelid <> 0 as ret_is_composite,
          coalesce(p.proargnames, '{}') as arg_names,
          coalesce(p.proargmodes::text[], '{}') as arg_modes,
          (select array_agg(t.typname order by o.ord) from unnest(coalesce(p.proallargtypes, p.proargtypes::oid[]))
             with ordinality o(oid, ord) join pg_type t on t.oid = o.oid) as arg_udts,
          p.pronargdefaults as n_defaults, p.pronargs as n_args
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     join pg_type rt on rt.oid = p.prorettype
    where n.nspname = $1 and p.prokind = 'f'
      and rt.typname <> 'trigger'
    order by p.proname`,
  [SCHEMA],
)

const indent = (s, n) => s.split('\n').map((l) => (l ? ' '.repeat(n) + l : l)).join('\n')

function renderTable(t) {
  const cols = columns.filter((c) => c.table_name === t.name)
  const row = cols.map((c) => `${c.column_name}: ${tsType(c.udt_name)}${c.nullable ? ' | null' : ''}`)
  const insert = cols.map((c) => {
    if (c.is_generated || c.identity_generation === 'ALWAYS') return `${c.column_name}?: never`
    const optional = c.nullable || c.has_default || c.is_identity
    return `${c.column_name}${optional ? '?' : ''}: ${tsType(c.udt_name)}${c.nullable ? ' | null' : ''}`
  })
  const update = cols.map((c) =>
    c.is_generated || c.identity_generation === 'ALWAYS'
      ? `${c.column_name}?: never`
      : `${c.column_name}?: ${tsType(c.udt_name)}${c.nullable ? ' | null' : ''}`,
  )
  const rels = fks
    .filter((f) => f.table_name === t.name)
    .map(
      (f) => `{
  foreignKeyName: "${f.name}"
  columns: [${f.cols.map((c) => `"${c}"`).join(', ')}]
  isOneToOne: ${isOneToOne(t.name, f.cols)}
  referencedRelation: "${f.ref_table}"
  referencedColumns: [${f.ref_cols.map((c) => `"${c}"`).join(', ')}]
},`,
    )
  const block = (name, lines) => `${name}: {\n${indent(lines.join('\n'), 2)}\n}`
  const parts =
    t.kind === 'r'
      ? [block('Row', row), block('Insert', insert), block('Update', update)]
      : [block('Row', row.map((l) => l.replace(/: (.+?)( \| null)?$/, ': $1 | null')))]
  parts.push(rels.length ? `Relationships: [\n${indent(rels.join('\n'), 2)}\n]` : 'Relationships: []')
  return `${t.name}: {\n${indent(parts.join('\n'), 2)}\n}`
}

async function compositeFields(udt) {
  return q(
    `select a.attname as name, t.typname as udt, not a.attnotnull as nullable
       from pg_type ct join pg_attribute a on a.attrelid = ct.typrelid
       join pg_type t on t.oid = a.atttypid
      where ct.typname = $1 and a.attnum > 0 and not a.attisdropped order by a.attnum`,
    [udt],
  )
}

async function renderFunction(f) {
  const args = []
  const outs = []
  const modes = f.arg_modes.length ? f.arg_modes : f.arg_udts?.map(() => 'i') ?? []
  const firstDefault = f.n_args - f.n_defaults
  let inIndex = 0
  modes.forEach((mode, i) => {
    const name = f.arg_names[i]
    const udt = f.arg_udts[i]
    if (mode === 'i' || mode === 'b') {
      args.push(`${name}${inIndex >= firstDefault ? '?' : ''}: ${tsType(udt)}`)
      inIndex += 1
    }
    if (mode === 'o' || mode === 't' || mode === 'b') outs.push(`${name}: ${tsType(udt)}`)
  })
  let returns
  if (outs.length) {
    returns = `{\n${indent(outs.join('\n'), 2)}\n}[]`
  } else if (f.ret_is_composite) {
    const fields = await compositeFields(f.ret_udt)
    const table = tables.find((t) => t.name === f.ret_udt)
    returns = table
      ? `Database["public"]["Tables"]["${f.ret_udt}"]["Row"]${f.returns_set ? '[]' : ''}`
      : `{\n${indent(fields.map((x) => `${x.name}: ${tsType(x.udt)}${x.nullable ? ' | null' : ''}`).join('\n'), 2)}\n}${f.returns_set ? '[]' : ''}`
  } else {
    returns = `${tsType(f.ret_udt)}${f.returns_set ? '[]' : ''}`
  }
  const argsBlock = args.length ? `{\n${indent(args.join('\n'), 2)}\n}` : 'never'
  return `${f.name}: {\n  Args: ${argsBlock.replace(/\n/g, '\n  ')}\n  Returns: ${returns.replace(/\n/g, '\n  ')}\n}`
}

const tableBlocks = tables.filter((t) => t.kind === 'r').map(renderTable)
const viewBlocks = tables.filter((t) => t.kind !== 'r').map(renderTable)
const fnBlocks = []
for (const f of functions) fnBlocks.push(await renderFunction(f))
const enumBlocks = enums.map((e) => `${e.name}: ${e.labels.map((l) => `"${l}"`).join(' | ')}`)
const empty = '{\n  [_ in never]: never\n}'
const section = (items) => (items.length ? `{\n${indent(items.join('\n'), 2)}\n}` : empty)

const output = `// Generado por scripts/gen-db-types.mjs a partir de supabase/migrations. No editar a mano.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12"
  }
  public: {
    Tables: ${section(tableBlocks).replace(/\n/g, '\n    ')}
    Views: ${section(viewBlocks).replace(/\n/g, '\n    ')}
    Functions: ${section(fnBlocks).replace(/\n/g, '\n    ')}
    Enums: ${section(enumBlocks).replace(/\n/g, '\n    ')}
    CompositeTypes: ${empty.replace(/\n/g, '\n    ')}
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]
`

await pg.close()

if (process.argv.includes('--check')) {
  const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : ''
  if (current !== output) {
    console.error('database.types.ts está desactualizado: corré `npm run db:types:gen`.')
    process.exit(1)
  }
  console.log('database.types.ts al día.')
} else {
  writeFileSync(OUT, output)
  console.log(`Escrito ${OUT}`)
}
