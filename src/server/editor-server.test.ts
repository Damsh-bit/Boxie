import { beforeAll, describe, expect, it, vi } from 'vitest'
import { editorFingerprint, issueEditorSession, readEditorSession } from './editor-session'
import { boxiePhotoPath, sniffImage } from './media'
import { sign } from './security/signed'

const SECRET = 'x'.repeat(48)

beforeAll(() => {
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://boxie.test')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://supabase.test')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service')
  vi.stubEnv('SESSION_SECRET', SECRET)
  vi.stubEnv('TOKEN_ENCRYPTION_KEY', Buffer.alloc(32, 7).toString('base64'))
  vi.stubEnv('PAYMENTS_PROVIDER', 'fake')
})

describe('sesión del editor', () => {
  const boxieId = '0f3c9a4e-2b7d-4c1e-9a8b-3d2e1f0a9b8c'
  const editHash = 'a'.repeat(64)

  it('la cookie firmada lleva la Boxie y la huella del token de edición', () => {
    const session = readEditorSession(issueEditorSession(boxieId, editHash))
    expect(session).toMatchObject({ purpose: 'editor', boxieId, fp: editorFingerprint(editHash) })
  })

  it('una cookie modificada o de otro propósito no sirve', () => {
    const value = issueEditorSession(boxieId, editHash)
    const [data, mac] = value.split('.')
    const forged = Buffer.from(
      JSON.stringify({
        ...JSON.parse(Buffer.from(data!, 'base64url').toString()),
        boxieId: 'otra',
      }),
    ).toString('base64url')
    expect(readEditorSession(`${forged}.${mac}`)).toBeNull()

    const gift = sign({ purpose: 'gift', boxieId, fp: 'x', exp: 9_999_999_999 }, SECRET)
    expect(readEditorSession(gift)).toBeNull()
    expect(readEditorSession(undefined)).toBeNull()
  })

  it('rotar el token de edición cambia la huella (las sesiones viejas caducan)', () => {
    expect(editorFingerprint('a'.repeat(64))).not.toBe(editorFingerprint('b'.repeat(64)))
  })
})

describe('fotos', () => {
  const bytes = (...values: (number | string)[]) =>
    Uint8Array.from(
      values.flatMap((v) => (typeof v === 'string' ? [...v].map((c) => c.charCodeAt(0)) : [v])),
    )

  it('reconoce el formato real por los primeros bytes', () => {
    expect(sniffImage(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0))).toBe('image/jpeg')
    expect(sniffImage(bytes(0x89, 'PNG', 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe('image/png')
    expect(sniffImage(bytes('RIFF', 0, 0, 0, 0, 'WEBP', 'VP8 '))).toBe('image/webp')
  })

  it('rechaza lo que no es una foto aunque diga serlo', () => {
    expect(sniffImage(bytes('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull()
    expect(sniffImage(bytes('GIF89a'))).toBeNull()
    expect(sniffImage(bytes('RIFF', 0, 0, 0, 0, 'WAVE'))).toBeNull()
    expect(sniffImage(new Uint8Array())).toBeNull()
  })

  it('cada foto vive en la carpeta de su Boxie', () => {
    expect(boxiePhotoPath('b1', 'f1', 'image/webp')).toBe('boxies/b1/f1.webp')
    expect(boxiePhotoPath('b1', 'f2', 'image/jpeg')).toBe('boxies/b1/f2.jpg')
  })
})
