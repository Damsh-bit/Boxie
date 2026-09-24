import { PageTransition } from '@/ui/PageTransition'

/** Cada navegación dentro del sitio público entra con un fundido corto. */
export default function MarketingTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>
}
