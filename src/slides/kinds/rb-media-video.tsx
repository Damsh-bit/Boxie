import { motion } from 'framer-motion'
import {
  ExternalLink,
  Maximize,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { EmojiText } from '@/ui/Icon'
import { youtubeId } from '../fields'
import { Confetti, PartyScene } from '../ribbly/art'
import { Btn, Chip, Stage, T, u } from '../ribbly/ui'
import { Appear, ease, spring } from './motion'
import type { Props } from './shared'

const YT_ORIGIN = 'https://www.youtube-nocookie.com'

const clock = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

interface PlayerState {
  time: number
  duration: number
  playing: boolean
  muted: boolean
  failed: boolean
}

/**
 * Maneja el reproductor de YouTube por mensajes (sin cargar su script): le
 * pide que avise su estado y le manda las órdenes de los controles propios.
 * El video arranca en silencio, que es lo único que los navegadores dejan
 * reproducir solo; el sonido se activa con el primer toque.
 */
function useYouTube(enabled: boolean) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [state, setState] = useState<PlayerState>({
    time: 0,
    duration: 0,
    playing: false,
    muted: true,
    failed: false,
  })

  const send = (func: string, args: unknown[] = []) =>
    frame.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args }),
      YT_ORIGIN,
    )

  useEffect(() => {
    if (!enabled) return
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== YT_ORIGIN || event.source !== frame.current?.contentWindow) return
      let data: { event?: string; info?: Record<string, unknown> | number }
      try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
      } catch {
        return
      }
      if (data.event === 'onError') return setState((s) => ({ ...s, failed: true }))
      const info = data.info
      if (!info || typeof info !== 'object') return
      setState((s) => ({
        ...s,
        time: typeof info.currentTime === 'number' ? info.currentTime : s.time,
        duration:
          typeof info.duration === 'number' && info.duration > 0 ? info.duration : s.duration,
        playing: typeof info.playerState === 'number' ? info.playerState === 1 : s.playing,
        muted: typeof info.muted === 'boolean' ? info.muted : s.muted,
      }))
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [enabled])

  /** Al cargar el iframe hay que presentarse para que empiece a avisar. */
  const listen = () => {
    const target = frame.current?.contentWindow
    if (!target) return
    target.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), YT_ORIGIN)
    for (const name of ['onStateChange', 'onError']) {
      target.postMessage(
        JSON.stringify({ event: 'command', func: 'addEventListener', args: [name] }),
        YT_ORIGIN,
      )
    }
    // En silencio YouTube prende los subtítulos automáticos: acá tapan el título.
    for (const part of ['captions', 'cc']) {
      target.postMessage(
        JSON.stringify({ event: 'command', func: 'unloadModule', args: [part] }),
        YT_ORIGIN,
      )
    }
  }

  return {
    frame,
    state,
    listen,
    toggle: () => send(state.playing ? 'pauseVideo' : 'playVideo'),
    restart: () => {
      send('seekTo', [0, true])
      send('playVideo')
    },
    sound(on: boolean) {
      send(on ? 'unMute' : 'mute')
      if (on) {
        send('setVolume', [100])
        send('playVideo')
      }
      setState((s) => ({ ...s, muted: !on }))
    },
  }
}

/**
 * 06 · Su canción: el video de YouTube a pantalla completa con controles
 * propios. El reproductor se monta solo con la slide en pantalla (si no, la
 * música arrancaría una pantalla antes).
 */
export function MediaVideo({ theme, buyer, ctx }: Props<'media.video'>) {
  const active = ctx.active
  const id = youtubeId(buyer.youtubeUrl)
  const stage = useRef<HTMLDivElement>(null)
  const { frame, state, listen, toggle, restart, sound } = useYouTube(active && !!id)
  const title = buyer.songTitle.trim() || theme.defaultTitle
  const progress = state.duration ? Math.min(state.time / state.duration, 1) : 0
  const showVideo = !!id && active && !state.failed

  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    controls: '0',
    rel: '0',
    modestbranding: '1',
    loop: '1',
    playsinline: '1',
    enablejsapi: '1',
    ...(id ? { playlist: id } : {}),
  })

  const fullscreen = () => {
    const element = stage.current
    if (!element) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void element.requestFullscreen?.().catch(() => {})
  }

  return (
    <Stage bg="#0d0a16">
      <div ref={stage} style={{ position: 'absolute', inset: 0, background: '#0d0a16' }}>
        <div className="rb-bg">
          {showVideo ? (
            <motion.iframe
              ref={frame}
              className="rb-video"
              src={`${YT_ORIGIN}/embed/${id}?${params}`}
              allow="autoplay; encrypted-media; fullscreen"
              title={title}
              referrerPolicy="strict-origin-when-cross-origin"
              onLoad={listen}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, delay: 0.3, ease: ease.out }}
            />
          ) : id ? (
            // Sin reproductor (no se pudo insertar, o la slide no está en pantalla): la portada.
            <img
              src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <>
              <PartyScene />
              <Confetti seed={6} count={14} opacity={0.8} />
            </>
          )}
          <div className="rb-video-shade" />
        </div>

        <div className="rb-body" style={{ alignItems: 'stretch', textAlign: 'left' }}>
          <Appear active={active} y={-12} style={{ marginTop: u(-22), alignSelf: 'flex-start' }}>
            <Chip mods="is-glass" style={{ fontSize: u(12) }}>
              <Play size={11} fill="currentColor" />
              <T text={theme.badge} ctx={ctx} />
            </Chip>
          </Appear>

          <div style={{ marginTop: 'auto' }}>
            {showVideo && state.muted && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 1.2 } }}
                style={{ marginBottom: u(14) }}
              >
                <Btn variant="white" mods="is-small" onClick={() => sound(true)}>
                  <VolumeX size={15} />
                  <T text={theme.unmute} ctx={ctx} />
                </Btn>
              </motion.div>
            )}
            <Appear
              as="p"
              active={active}
              delay={0.3}
              className="rb-kicker"
              style={{ color: 'var(--rb-sol)' }}
            >
              <T text={theme.kicker} ctx={ctx} />
            </Appear>
            <Appear
              as="h2"
              active={active}
              delay={0.4}
              className="rb-title"
              style={{
                fontSize: u(title.length > 22 ? 28 : 36),
                marginTop: u(6),
                overflowWrap: 'anywhere',
              }}
            >
              <EmojiText text={title} />
            </Appear>
            <Appear
              as="p"
              active={active}
              delay={0.5}
              className="rb-sub"
              style={{ marginTop: u(6), textWrap: 'pretty' }}
            >
              <T text={id || ctx.preview ? theme.caption : theme.emptyLabel} ctx={ctx} />
            </Appear>

            {!id && ctx.preview && (
              <p className="rb-sub" style={{ marginTop: u(10), opacity: 0.7 }}>
                <T text={theme.emptyLabel} ctx={ctx} />
              </p>
            )}

            {id && state.failed && (
              <div style={{ marginTop: u(16) }}>
                <Btn variant="white" href={`https://www.youtube.com/watch?v=${id}`}>
                  <ExternalLink size={16} /> Escuchar en YouTube
                </Btn>
              </div>
            )}

            {showVideo && (
              <Appear active={active} delay={0.65} y={24} style={{ marginTop: u(22) }}>
                <div
                  className="rb-track"
                  role="progressbar"
                  aria-valuenow={Math.round(progress * 100)}
                >
                  <motion.i
                    className="rb-track-fill"
                    animate={{ scaleX: progress }}
                    transition={{ duration: 0.3, ease: 'linear' }}
                  />
                  <motion.i
                    className="rb-track-knob"
                    animate={{ left: `${progress * 100}%` }}
                    transition={{ duration: 0.3, ease: 'linear' }}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: u(8),
                    fontSize: u(11),
                    fontWeight: 500,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  <span>{clock(state.time)}</span>
                  <span>{state.duration ? clock(state.duration) : '–:––'}</span>
                </div>
                <div className="rb-player-row">
                  <button
                    type="button"
                    className="rb-ctl"
                    onClick={() => sound(state.muted)}
                    aria-label={state.muted ? 'Activar el sonido' : 'Silenciar'}
                  >
                    {state.muted ? <VolumeX /> : <Volume2 />}
                  </button>
                  <button
                    type="button"
                    className="rb-ctl"
                    onClick={restart}
                    aria-label="Volver a empezar"
                  >
                    <SkipBack fill="currentColor" />
                  </button>
                  <motion.button
                    type="button"
                    className="rb-ctl is-main"
                    onClick={toggle}
                    aria-label={state.playing ? 'Pausar' : 'Reproducir'}
                    whileTap={{ scale: 0.9 }}
                    transition={spring.snappy}
                  >
                    {state.playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
                  </motion.button>
                  <button
                    type="button"
                    className="rb-ctl"
                    onClick={ctx.next}
                    aria-label="Pantalla siguiente"
                  >
                    <SkipForward fill="currentColor" />
                  </button>
                  <button
                    type="button"
                    className="rb-ctl"
                    onClick={fullscreen}
                    aria-label="Pantalla completa"
                  >
                    <Maximize />
                  </button>
                </div>
              </Appear>
            )}
          </div>
          {/* Aire para las flechas del player. */}
          <div style={{ height: u(showVideo ? 92 : 60) }} />
        </div>
      </div>
    </Stage>
  )
}
