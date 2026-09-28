import { describe, expect, it } from 'vitest'
import {
  modulesOf,
  nextStep,
  pickPlan,
  savingsOf,
  type BuilderModule,
  type BuilderPlan,
} from './quote-builder'

const PLANS: BuilderPlan[] = [
  {
    slug: 'esencial',
    name: 'Esencial',
    priceCents: 349_000,
    compareAtCents: null,
    days: 30,
    maxPhotos: 10,
    allowPassword: false,
  },
  {
    slug: 'clasica',
    name: 'Clásica',
    priceCents: 499_000,
    compareAtCents: 899_000,
    days: 60,
    maxPhotos: 20,
    allowPassword: true,
  },
  {
    slug: 'premium',
    name: 'Premium',
    priceCents: 799_000,
    compareAtCents: null,
    days: 120,
    maxPhotos: 30,
    allowPassword: true,
  },
]

const MODULES: BuilderModule[] = [
  { kind: 'story.dedication', from: 0 },
  { kind: 'media.song', from: 0 },
  { kind: 'game.trivia', from: 1 },
  { kind: 'game.jackpot', from: 1 },
  { kind: 'media.streaming', from: 2 },
]

const none = { modules: [], photos: 0, days: 0, password: false }

describe('pickPlan', () => {
  it('sin pedir nada, el más básico (sin motivos)', () => {
    expect(pickPlan(PLANS, MODULES, none)).toEqual({ index: 0, reasons: [] })
  })

  it('un juego lleva al plan que lo trae y dice por qué', () => {
    expect(pickPlan(PLANS, MODULES, { ...none, modules: ['media.song', 'game.trivia'] })).toEqual({
      index: 1,
      reasons: [{ type: 'module', kind: 'game.trivia' }],
    })
  })

  it('manda lo que pide el plan más alto', () => {
    const pick = pickPlan(PLANS, MODULES, {
      ...none,
      modules: ['game.trivia', 'media.streaming'],
      password: true,
    })
    expect(pick?.index).toBe(2)
    expect(pick?.reasons).toEqual([{ type: 'module', kind: 'media.streaming' }])
  })

  it('fotos, días y clave también suben de plan', () => {
    expect(pickPlan(PLANS, MODULES, { ...none, photos: 15 })?.index).toBe(1)
    expect(pickPlan(PLANS, MODULES, { ...none, photos: 10 })?.index).toBe(0)
    expect(pickPlan(PLANS, MODULES, { ...none, days: 90 })).toEqual({
      index: 2,
      reasons: [{ type: 'days', days: 90 }],
    })
    expect(pickPlan(PLANS, MODULES, { ...none, password: true })).toEqual({
      index: 1,
      reasons: [{ type: 'password' }],
    })
  })

  it('si nada alcanza, lo dice (null)', () => {
    expect(pickPlan(PLANS, MODULES, { ...none, photos: 50 })).toBeNull()
    expect(pickPlan(PLANS, MODULES, { ...none, modules: ['game.inexistente'] })).toBeNull()
    expect(pickPlan([], MODULES, none)).toBeNull()
  })
})

describe('modulesOf y nextStep', () => {
  it('un plan trae lo suyo y lo de abajo', () => {
    expect(modulesOf(MODULES, 1)).toEqual([
      'story.dedication',
      'media.song',
      'game.trivia',
      'game.jackpot',
    ])
  })

  it('el paso siguiente: cuánto más y qué suma', () => {
    expect(nextStep(PLANS, MODULES, 1)).toMatchObject({
      index: 2,
      extraCents: 300_000,
      adds: ['media.streaming'],
    })
    expect(nextStep(PLANS, MODULES, 2)).toBeNull()
  })

  it('el ahorro frente al tachado', () => {
    expect(savingsOf(PLANS[1]!)).toBe(44)
    expect(savingsOf(PLANS[0]!)).toBe(0)
  })
})
