import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

/**
 * Regla de dependencias (docs/ARQUITECTURA.md §3.1):
 *   domain no importa nada · server importa domain · app importa server y domain.
 *   slides corre en el navegador: nunca importa server.
 */
const restrict = (patterns) => ['error', { patterns }]

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
    },
  },
  {
    files: ['src/domain/**'],
    rules: {
      'no-restricted-imports': restrict([
        {
          group: ['@/*', '!@/domain/*', 'next', 'next/*', 'react', 'react-dom', '@supabase/*'],
          message: 'domain es lógica pura: no importa framework, I/O ni otras capas.',
        },
      ]),
    },
  },
  {
    files: ['src/server/**'],
    rules: {
      'no-restricted-imports': restrict([
        { group: ['@/slides/*', '@/ui/*'], message: 'server no depende de la UI.' },
      ]),
    },
  },
  {
    files: ['src/slides/**', 'src/ui/**'],
    rules: {
      'no-restricted-imports': restrict([
        { group: ['@/server/*'], message: 'Los componentes de UI no acceden al servidor directamente.' },
      ]),
    },
  },
  {
    // El player muestra media dinámica (URLs firmadas, assets de temáticas): <img> es intencional.
    files: ['src/slides/**'],
    rules: { '@next/next/no-img-element': 'off' },
  },
  {
    files: ['scripts/**', 'tests/**', '*.config.*'],
    rules: { 'no-console': 'off' },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'next-env.d.ts',
    'playwright-report/**',
    'test-results/**',
    'supabase/.temp/**',
    'src/server/db/database.types.ts',
  ]),
])
