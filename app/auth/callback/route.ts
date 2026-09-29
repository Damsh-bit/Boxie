import { NextResponse } from 'next/server'
import { createCustomerSupabase } from '@/server/customer/session'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/cuenta'

  if (code) {
    const supabase = await createCustomerSupabase()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Redirección segura: solo rutas relativas que empiecen con /
      const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/cuenta'
      return NextResponse.redirect(`${origin}${safeNext}`)
    }
  }

  // Si falló el intercambio de código, volvemos al login con error
  return NextResponse.redirect(`${origin}/cuenta/login?error=auth_callback_failed`)
}
