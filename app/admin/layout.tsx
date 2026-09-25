import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { default: 'Panel', template: '%s · Panel Boxie' },
  robots: { index: false, follow: false },
}

/** El panel no comparte la navegación ni el pie del sitio público. */
export default function AdminLayout({ children }: LayoutProps<'/admin'>) {
  return children
}
