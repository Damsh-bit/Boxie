'use client'

import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { getBrowserSupabase } from '@/client/supabase'
import { Spinner } from '@/ui/motion'

export function CustomerLogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    try {
      setLoading(true)
      const supabase = getBrowserSupabase()
      await supabase.auth.signOut()
      router.push('/')
      router.refresh()
    } catch {
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      title="Cerrar sesión"
      className="inline-flex size-8 items-center justify-center rounded-xl border border-line text-neutral-500 transition-colors hover:border-neutral-300 hover:bg-neutral-100 hover:text-ink"
    >
      {loading ? <Spinner className="size-3.5" /> : <LogOut className="size-3.5" />}
    </button>
  )
}
