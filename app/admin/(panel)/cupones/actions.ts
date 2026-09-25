'use server'

import { z } from 'zod'
import { CouponInputSchema } from '@/domain/admin/inputs'
import { MONEY_ROLES, runAction } from '../../_lib/action'

const paths = ['/admin', '/admin/cupones', '/admin/configuracion']

export async function saveCoupon(input: unknown) {
  return runAction({ roles: MONEY_ROLES, revalidate: paths }, async ({ repo, actor }) => {
    const coupon = await repo.saveCoupon(CouponInputSchema.parse(input), actor)
    return { message: `Cupón ${coupon.code} guardado` }
  })
}

export async function setCouponActive(id: string, active: boolean) {
  return runAction({ roles: MONEY_ROLES, revalidate: paths }, async ({ repo, actor }) => {
    await repo.setCouponActive(z.string().min(1).parse(id), z.boolean().parse(active), actor)
    return { message: active ? 'Cupón activado' : 'Cupón pausado' }
  })
}

export async function deleteCoupon(id: string) {
  return runAction({ roles: MONEY_ROLES, revalidate: paths }, async ({ repo, actor }) => {
    await repo.deleteCoupon(z.string().min(1).parse(id), actor)
    return { message: 'Cupón borrado' }
  })
}

export async function setOfferCoupon(couponId: string | null, delaySeconds: number) {
  return runAction({ roles: MONEY_ROLES, revalidate: [...paths, '/'] }, async ({ repo, actor }) => {
    await repo.saveSettings(
      {
        offerCouponId: couponId ? z.string().min(1).parse(couponId) : null,
        offerDelaySeconds: z.number().int().min(0).max(600).parse(delaySeconds),
      },
      actor,
    )
    return { message: couponId ? 'Oferta de la ficha actualizada' : 'Oferta de la ficha apagada' }
  })
}
