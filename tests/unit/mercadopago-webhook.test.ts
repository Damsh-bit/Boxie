import { describe, expect, it } from 'vitest'
import crypto from 'node:crypto'
import { verifyMpWebhookSignature } from '@/server/mercadopago'

describe('verifyMpWebhookSignature', () => {
  const secret = 'test-secret-key-12345'
  const dataId = '9876543210'
  const requestId = 'req-abc-xyz'
  const ts = '1710000000'

  function createValidSignature(
    tsVal: string,
    dataIdVal: string,
    reqIdVal: string,
    secretKey: string,
  ) {
    const manifest = `id:${dataIdVal};request-id:${reqIdVal};ts:${tsVal};`
    const hash = crypto.createHmac('sha256', secretKey).update(manifest).digest('hex')
    return `ts=${tsVal},v1=${hash}`
  }

  it('valida correctamente una firma auténtica', () => {
    const xSignature = createValidSignature(ts, dataId, requestId, secret)
    const valid = verifyMpWebhookSignature({
      xSignature,
      xRequestId: requestId,
      dataId,
      secret,
    })
    expect(valid).toBe(true)
  })

  it('rechaza una firma con un secreto diferente', () => {
    const xSignature = createValidSignature(ts, dataId, requestId, 'otro-secreto')
    const valid = verifyMpWebhookSignature({
      xSignature,
      xRequestId: requestId,
      dataId,
      secret,
    })
    expect(valid).toBe(false)
  })

  it('rechaza cuando el dataId fue manipulado', () => {
    const xSignature = createValidSignature(ts, dataId, requestId, secret)
    const valid = verifyMpWebhookSignature({
      xSignature,
      xRequestId: requestId,
      dataId: '1111111111',
      secret,
    })
    expect(valid).toBe(false)
  })

  it('rechaza si falta el encabezado o el secreto', () => {
    expect(
      verifyMpWebhookSignature({
        xSignature: null,
        xRequestId: requestId,
        dataId,
        secret,
      }),
    ).toBe(false)

    expect(
      verifyMpWebhookSignature({
        xSignature: 'ts=123,v1=abc',
        xRequestId: requestId,
        dataId,
        secret: '',
      }),
    ).toBe(false)
  })

  it('soporta números para dataId', () => {
    const numId = 12345678
    const xSignature = createValidSignature(ts, String(numId), requestId, secret)
    const valid = verifyMpWebhookSignature({
      xSignature,
      xRequestId: requestId,
      dataId: numId,
      secret,
    })
    expect(valid).toBe(true)
  })
})
