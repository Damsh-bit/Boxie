import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { metaUserData } from './meta-capi'

const sha = (v: string) => createHash('sha256').update(v).digest('hex')

describe('API de conversiones de Meta', () => {
  it('normaliza y cifra el mail y el teléfono como pide Meta', () => {
    const data = metaUserData('  Sofi@Ejemplo.com ', '+54 9 11 1234-5678')
    expect(data.em).toEqual([sha('sofi@ejemplo.com')])
    expect(data.external_id).toEqual(data.em)
    expect(data.ph).toEqual([sha('5491112345678')])
    expect(metaUserData('a@b.com', '011 4444-5555').ph).toEqual([sha('541144445555')])
    expect(metaUserData('a@b.com', null).ph).toEqual([])
  })
})
