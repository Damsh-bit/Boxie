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
import { ReflectGratitude } from './kinds/reflect-gratitude'
import { ReflectJournal } from './kinds/reflect-journal'
import { StoryAnecdote } from './kinds/story-anecdote'
import { StoryDedication } from './kinds/story-dedication'
import { StoryEditorial } from './kinds/story-editorial'
import { StoryIntro } from './kinds/story-intro'
import { StoryReasons } from './kinds/story-reasons'
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
} satisfies { [K in SlideKind]: ComponentType<Props<K>> }

export const slideRegistry = Object.fromEntries(
  (Object.keys(slideDefinitions) as SlideKind[]).map((kind) => [
    kind,
    { ...slideDefinitions[kind], Component: slideComponents[kind] },
  ]),
) as { [K in SlideKind]: (typeof slideDefinitions)[K] & { Component: (typeof slideComponents)[K] } }
