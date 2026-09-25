/** Lo que devuelve toda Server Action del panel (lo usan también los componentes de cliente). */
export type ActionResult<T = null> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string; fields?: Record<string, string> }
