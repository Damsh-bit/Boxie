# Cobrar a compradores del exterior

**Estado:** investigado el 18/11/2026. Hoy se cobra solo en ARS con Mercado Pago. Este documento es la base para decidir
cuándo y cómo sumar compradores de afuera, sin abrir una LLC.

## Lo que hay que saber primero

- **Ninguna opción es gratis para cobrar con tarjeta.** Visa y Mastercard le cobran al procesador y él lo traslada.
  Lo que sí existe es **costo fijo cero**: no hay abono y solo se paga un porcentaje cuando hay venta.
- **El cargo fijo por venta pesa mucho en tickets chicos.** Sobre un regalo de unos US$10, US$0,50 fijos son 5%.
- **Merchant of Record (MoR)** = la empresa le vende al cliente en tu nombre y **liquida el IVA o el sales tax de cada
  país**. Sin un MoR, si un europeo compra un producto digital, ese impuesto es problema tuyo.

## Opciones (sin LLC)

| Opción                    | Costo por venta (2026)                                             | MoR (impuestos) | Integración automática                            | Cobrás en | Notas                                                                                    |
| ------------------------- | ------------------------------------------------------------------ | --------------- | ------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------- |
| **Paddle**                | 5% + US$0,50, todo incluido                                        | Sí              | Sí (checkout + webhook)                           | USD       | El más maduro. Argentina no está excluida. Aprueba a mano: puede rechazar.               |
| **Polar**                 | 5% + US$0,50 **+ 1,5% tarjeta internacional**                      | Sí              | Sí                                                | USD       | Subió precios en 2026: hoy sale más caro que Paddle para ventas de afuera.               |
| **dLocal Go**             | Sin tarifa pública para tarjetas internacionales (cotizar)         | No              | Sí (API, links)                                   | ARS       | Liquida en la moneda local: no te quedás con dólares. No confirma tarjetas de EE.UU.     |
| **Payoneer**              | Hasta 3,99% + US$0,49 (+ hasta 1,8% internacional)                 | No              | Links manuales; el "Checkout" requiere aprobación | USD       | El más barato en %, pero pensado para cobrar a clientes uno por uno, no para una tienda. |
| **Takenos (TakeLink)**    | 4,5–6% + US$0,45–0,50                                              | No              | Links manuales                                    | USD       | Fintech argentina. Sirve para cobros puntuales, no para el checkout automático.          |
| **PayPal**                | ~5,4% + cargo fijo + conversión                                    | No              | Sí                                                | USD       | Retirar la plata en Argentina es engorroso.                                              |
| ~~Lemon Squeezy~~         | —                                                                  | —               | —                                                 | —         | Migra a Stripe Managed Payments, que **no** acepta vendedores de Argentina. Descartado.  |
| ~~Stripe directo~~        | —                                                                  | —               | —                                                 | —         | Exige una empresa en un país soportado (LLC). Descartado.                                |
| **Mercado Pago (actual)** | Tu comisión actual (+ recargo por tarjeta extranjera, a confirmar) | No              | Ya integrado                                      | ARS       | No hay fuente oficial que garantice tarjetas del exterior. Cobra en ARS.                 |

## Recomendación

1. **Hoy, gratis:** medir antes de integrar. Pedirle a alguien con tarjeta de afuera que compre el plan más barato y
   después reembolsarlo desde el panel. Si Mercado Pago la acepta, ya hay un camino sin tocar código. Además, mirar en
   el panel cuántos pagos rechazados hay por tarjeta extranjera.
2. **Cuando haya demanda real de afuera** (por ejemplo, más de 5–10 intentos por mes): **Paddle**. Es el que mejor
   combina confiabilidad, costo (5% + US$0,50 todo incluido), cero costo fijo y cero trámite de impuestos en el
   exterior. Si Paddle no aprueba la cuenta, el plan B es **Polar** (funciona igual, pero cuesta ~1,5% más por venta
   internacional).
3. **Precio en USD propio** (por ejemplo US$ 9,99), no convertido del peso.
4. **Contador:** con un MoR tu único cliente del exterior es la empresa (Paddle o Polar); normalmente se emite una
   factura E por cada liquidación. Confirmarlo según tu categoría.

## Si se integra Paddle (estimado: 1–2 días + pruebas en su sandbox)

- `plans.price_usd_cents` y el precio en USD en el panel.
- Proveedor `paddle` en `PaymentNotice` y `payment_provider`; checkout con Paddle.js y `order.id` en `custom_data`.
- Webhook `/api/webhooks/paddle` con verificación de `Paddle-Signature` → `applyPaymentNotice` (`apply_payment` ya
  valida monto y moneda; con precio con impuesto incluido, comparar contra el subtotal).
- Elegir carril por país (`x-vercel-ip-country`) con un selector visible "¿Pagás desde Argentina?".
- Agregar `https://cdn.paddle.com`, `https://*.paddle.com` a la CSP (`proxy.ts`).

### Fuentes

- [Polar · tarifas 2026](https://www.snagr.sh/blog/polar-fees-explained) · [Polar · países de pago](https://polar.sh/docs/merchant-of-record/supported-countries)
- [Paddle · países](https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle) · [Paddle · tarifas](https://adlega.com/compare/paddle-pricing/)
- [Stripe Managed Payments no cubre Argentina](https://www.paddle.com/resources/stripe-managed-payments)
- [dLocal Go · pagos internacionales](https://dlocalgo.com/en/international-payments) · [dLocal Go · costos](https://helpcenter.dlocalgo.com/es/articles/9251261-que-costos-tengo-por-vender-con-dlocal-go)
- [Payoneer en Argentina (2026)](https://localbridge.com/blog/payoneer-argentina) · [Takenos · términos de TakeLink](https://help.takenos.com/en/articles/13408889-terminos-y-condiciones-takelink-link-de-pago)
