import 'server-only'
import { AdminRepoError, type AdminRepo } from './repo'

/**
 * ⚠️ PENDIENTE DE CONECTAR — el panel sobre Supabase.
 *
 * Mientras la base no esté conectada, el panel corre en modo demo
 * (DEMO_MODE=1) sobre `demo/repo.ts`. Este archivo es el lugar donde va la
 * implementación real del mismo contrato (`AdminRepo`). Qué respalda cada
 * método, tabla por tabla, está en docs/ADMIN.md § "Conectar Supabase".
 *
 * Las tablas nuevas (planes, gastos, bitácora, tareas, perfiles del equipo,
 * columnas de configuración financiera) las crea la migración
 * `supabase/migrations/20260925120000_admin_backoffice.sql`.
 */

function notConnected(what: string): never {
  throw new AdminRepoError(
    `${what}: el panel todavía no está conectado a Supabase. Mientras tanto usá el modo demo (DEMO_MODE=1).`,
    'not_connected',
  )
}

const pending = (what: string) => async () => notConnected(what)

export const supabaseRepo: AdminRepo = {
  mode: 'supabase',
  dataset: pending('Tablero'),
  getSettings: pending('Configuración'),
  saveSettings: pending('Guardar la configuración'),
  listPlans: pending('Planes'),
  savePlan: pending('Guardar un plan'),
  deletePlan: pending('Borrar un plan'),
  listThemes: pending('Temáticas'),
  getTheme: pending('Temática'),
  getVersionConfig: pending('Versión de la temática'),
  createTheme: pending('Crear una temática'),
  updateTheme: pending('Editar una temática'),
  saveThemeDraft: pending('Guardar el borrador'),
  publishTheme: pending('Publicar una temática'),
  duplicateTheme: pending('Duplicar una temática'),
  deleteTheme: pending('Borrar una temática'),
  getOrder: pending('Orden'),
  refundOrder: pending('Reembolsar'),
  getBoxie: pending('Boxie'),
  updateBoxieNames: pending('Editar la Boxie'),
  extendBoxie: pending('Extender la Boxie'),
  unlockBoxie: pending('Desbloquear la Boxie'),
  resendBoxieEmail: pending('Reenviar el mail'),
  saveCoupon: pending('Guardar un cupón'),
  setCouponActive: pending('Activar un cupón'),
  deleteCoupon: pending('Borrar un cupón'),
  saveAffiliate: pending('Guardar un afiliado'),
  saveExpense: pending('Guardar un gasto'),
  deleteExpense: pending('Borrar un gasto'),
  listTeam: pending('Equipo'),
  inviteMember: pending('Invitar al equipo'),
  updateMemberRole: pending('Cambiar el rol'),
  removeMember: pending('Sacar del equipo'),
  touchMember: async () => {},
  listAudit: pending('Bitácora'),
  listTasks: pending('Tareas'),
  saveTask: pending('Guardar una tarea'),
  moveTask: pending('Mover una tarea'),
  deleteTask: pending('Borrar una tarea'),
}
