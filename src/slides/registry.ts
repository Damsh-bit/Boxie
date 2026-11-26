import type { ComponentType } from 'react'
import { ConnectorCinema } from './kinds/connector-cinema'
import { ConnectorGamer } from './kinds/connector-gamer'
import { CoverBirthday } from './kinds/cover-birthday'
import { CoverFriends } from './kinds/cover-friends'
import { CoverRecipient } from './kinds/cover-recipient'
import { GameCoupons } from './kinds/game-coupons'
import { GameFortune } from './kinds/game-fortune'
import { GameJackpot } from './kinds/game-jackpot'
import { GameTrivia } from './kinds/game-trivia'
import { IntroLogo } from './kinds/intro-logo'
import { MediaPlaylists } from './kinds/media-playlists'
import { MediaSong } from './kinds/media-song'
import { MediaStreaming } from './kinds/media-streaming'
import { OutroSummary } from './kinds/outro-summary'
import { OutroThanks } from './kinds/outro-thanks'
import { ConnectorPremiere } from './kinds/rb-connector-premiere'
import { CoverAge } from './kinds/rb-cover-age'
import { CoverCake } from './kinds/rb-cover-cake'
import { GamePinata } from './kinds/rb-game-pinata'
import { GameQuiz } from './kinds/rb-game-quiz'
import { GameSlots } from './kinds/rb-game-slots'
import { GameVouchers } from './kinds/rb-game-vouchers'
import { CoverEdition } from './kinds/rb-cover-edition'
import { CoverGift } from './kinds/rb-cover-gift'
import { GameCookie } from './kinds/rb-game-cookie'
import { ReflectDiary } from './kinds/rb-reflect-diary'
import { ReflectPause } from './kinds/rb-reflect-pause'
import { IntroBrand } from './kinds/rb-intro-brand'
import { MediaMix } from './kinds/rb-media-mix'
import { MediaPoster } from './kinds/rb-media-poster'
import { MediaVideo } from './kinds/rb-media-video'
import { OutroFinale } from './kinds/rb-outro-finale'
import { OutroRecap } from './kinds/rb-outro-recap'
import { ReflectCandles } from './kinds/rb-reflect-candles'
import { ReflectCapsule } from './kinds/rb-reflect-capsule'
import { StoryCard } from './kinds/rb-story-card'
import { StoryMagazine } from './kinds/rb-story-magazine'
import { StoryMemory } from './kinds/rb-story-memory'
import { StoryMoments } from './kinds/rb-story-moments'
import { StoryWishes } from './kinds/rb-story-wishes'
import { ReflectGratitude } from './kinds/reflect-gratitude'
import { ReflectJournal } from './kinds/reflect-journal'
import { StoryAnecdote } from './kinds/story-anecdote'
import { StoryDedication } from './kinds/story-dedication'
import { StoryEditorial } from './kinds/story-editorial'
import { StoryIntro } from './kinds/story-intro'
import { StoryReasons } from './kinds/story-reasons'
import { StoryBond, StoryThread } from './kinds/rb-story-thread'
import type { Props } from './kinds/shared'
import { slideDefinitions, type SlideKind } from './schemas'

/**
 * El registro de slides (docs/ARQUITECTURA.md §4.3): cada tipo con su
 * contrato (schemas.ts) y su componente. Agregar una slide nueva es escribir
 * el componente y su schema; los formularios del admin y del editor salen
 * solos de ese schema.
 *
 * El `satisfies` hace que TypeScript exija un componente para cada tipo del
 * contrato, con las props exactas de ese tipo.
 */
export const slideComponents = {
  'intro.logo': IntroLogo,
  'cover.recipient': CoverRecipient,
  'cover.friends': CoverFriends,
  'cover.birthday': CoverBirthday,
  'story.intro': StoryIntro,
  'story.dedication': StoryDedication,
  'story.editorial': StoryEditorial,
  'story.reasons': StoryReasons,
  'story.anecdote': StoryAnecdote,
  'media.song': MediaSong,
  'media.playlists': MediaPlaylists,
  'media.streaming': MediaStreaming,
  'connector.gamer': ConnectorGamer,
  'connector.cinema': ConnectorCinema,
  'game.trivia': GameTrivia,
  'game.jackpot': GameJackpot,
  'game.coupons': GameCoupons,
  'game.fortune': GameFortune,
  'reflect.gratitude': ReflectGratitude,
  'reflect.journal': ReflectJournal,
  'outro.summary': OutroSummary,
  'outro.thanks': OutroThanks,
  // Pantallas nuevas de Ribbly (kinds/rb-*.tsx).
  'intro.brand': IntroBrand,
  'cover.cake': CoverCake,
  'cover.age': CoverAge,
  'story.card': StoryCard,
  'story.moments': StoryMoments,
  'media.video': MediaVideo,
  'media.mix': MediaMix,
  'game.quiz': GameQuiz,
  'connector.premiere': ConnectorPremiere,
  'media.poster': MediaPoster,
  'game.slots': GameSlots,
  'game.vouchers': GameVouchers,
  'story.magazine': StoryMagazine,
  'story.wishes': StoryWishes,
  'reflect.candles': ReflectCandles,
  'reflect.capsule': ReflectCapsule,
  'game.pinata': GamePinata,
  'story.memory': StoryMemory,
  'outro.recap': OutroRecap,
  'outro.finale': OutroFinale,
  // Pareja
  'cover.gift': CoverGift,
  'cover.edition': CoverEdition,
  'story.magazine-love': StoryMagazine,
  'reflect.pause': ReflectPause,
  'reflect.diary': ReflectDiary,
  'game.cookie': GameCookie,
  // El hilo de la historia
  'story.bond': StoryBond,
  'story.bond-love': StoryBond,
  'story.thread': StoryThread,
} satisfies { [K in SlideKind]: ComponentType<Props<K>> }

export const slideRegistry = Object.fromEntries(
  (Object.keys(slideDefinitions) as SlideKind[]).map((kind) => [
    kind,
    { ...slideDefinitions[kind], Component: slideComponents[kind] },
  ]),
) as { [K in SlideKind]: (typeof slideDefinitions)[K] & { Component: (typeof slideComponents)[K] } }
