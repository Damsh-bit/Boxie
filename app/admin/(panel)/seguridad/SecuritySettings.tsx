'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Copy,
  Download,
  KeyRound,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { Button } from '@/ui/Button'
import { Field, Input } from '@/ui/form'
import { ease, Notice, spring, Spinner } from '@/ui/motion'
import {
  confirmTotpSetupAction,
  disableTotpAction,
  startTotpSetupAction,
  type TotpStatus,
} from './actions'

export function SecuritySettings({ initialStatus }: { initialStatus: TotpStatus }) {
  const [status, setStatus] = useState<TotpStatus>(initialStatus)
  const [step, setStep] = useState<'idle' | 'setting_up' | 'showing_backup' | 'disabling'>('idle')

  // Setup state
  const [setupData, setSetupData] = useState<{
    setupToken: string
    secret: string
    qrCodeUrl: string
  } | null>(null)
  const [confirmCode, setConfirmCode] = useState('')
  const [setupError, setSetupError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [copiedSecret, setCopiedSecret] = useState(false)
  const [copiedCodes, setCopiedCodes] = useState(false)

  // Disable state
  const [disableCode, setDisableCode] = useState('')
  const [disableError, setDisableError] = useState<string | null>(null)

  const handleStartSetup = async () => {
    setLoading(true)
    setSetupError(null)
    const res = await startTotpSetupAction()
    setLoading(false)

    if (res.ok) {
      setSetupData(res.data)
      setStep('setting_up')
    } else {
      setSetupError(res.error)
    }
  }

  const handleConfirmSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!setupData || confirmCode.length !== 6) return

    setLoading(true)
    setSetupError(null)
    const res = await confirmTotpSetupAction(setupData.setupToken, confirmCode)
    setLoading(false)

    if (res.ok && res.backupCodes) {
      setStatus({ enabled: true, remainingBackupCodes: res.backupCodes.length })
      setBackupCodes(res.backupCodes)
      setStep('showing_backup')
    } else {
      setSetupError(res.error || 'Código incorrecto. Revisá tu app.')
    }
  }

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!disableCode) return

    setLoading(true)
    setDisableError(null)
    const res = await disableTotpAction(disableCode)
    setLoading(false)

    if (res.ok) {
      setStatus({ enabled: false, remainingBackupCodes: 0 })
      setStep('idle')
      setDisableCode('')
    } else {
      setDisableError(res.error || 'Código inválido.')
    }
  }

  const copyToClipboard = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text)
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  const downloadBackupCodes = () => {
    const text = `Boxie - Códigos de Respaldo 2FA\nFecha: ${new Date().toLocaleDateString()}\n\n${backupCodes.join(
      '\n',
    )}\n\nCada código se puede utilizar solo una vez.`
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `boxie-backup-codes-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Encabezado */}
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
          Seguridad de la cuenta
        </h1>
        <p className="mt-2 text-neutral-600">
          Administrá la autenticación en dos factores y protegé el acceso a tu cuenta en el panel.
        </p>
      </div>

      {/* Tarjeta Principal de Estado 2FA */}
      <div className="overflow-hidden rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div
              className={`grid size-12 shrink-0 place-items-center rounded-2xl ${
                status.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
              }`}
            >
              {status.enabled ? (
                <ShieldCheck className="size-6" />
              ) : (
                <ShieldAlert className="size-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-ink">Verificación en dos pasos (2FA)</h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    status.enabled
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {status.enabled ? 'Activo' : 'Desactivado'}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-neutral-600">
                {status.enabled
                  ? 'Tu cuenta está protegida. Al iniciar sesión, se requiere tu contraseña y un código temporal de tu app de autenticación.'
                  : 'Agregá una capa adicional de seguridad para que nadie pueda acceder al panel aunque conozcan tu contraseña.'}
              </p>
              {status.enabled && (
                <p className="mt-2 text-xs font-medium text-neutral-500">
                  Códigos de respaldo restantes: {status.remainingBackupCodes}
                </p>
              )}
            </div>
          </div>

          <div className="shrink-0">
            {status.enabled ? (
              <Button
                variant="outline"
                onClick={() => setStep('disabling')}
                className="border-neutral-200 text-rose-600 hover:border-rose-200 hover:bg-rose-50"
              >
                Desactivar 2FA
              </Button>
            ) : (
              <Button onClick={handleStartSetup} disabled={loading || step === 'setting_up'}>
                {loading ? <Spinner className="size-4" /> : 'Configurar 2FA'}
              </Button>
            )}
          </div>
        </div>

        {/* Paso de Activación con QR */}
        <AnimatePresence>
          {step === 'setting_up' && setupData && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: ease.out }}
              className="mt-8 border-t border-line pt-8"
            >
              <div className="flex items-center justify-between pb-4">
                <h3 className="font-display text-xl font-bold text-ink">
                  Escaneá el código con tu celular
                </h3>
                <button
                  type="button"
                  onClick={() => setStep('idle')}
                  className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-ink"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="grid gap-8 lg:grid-cols-2">
                {/* Lado QR */}
                <div className="flex flex-col items-center justify-center rounded-2xl border border-line bg-canvas p-6 text-center">
                  <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white p-2 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={setupData.qrCodeUrl}
                      alt="Código QR para 2FA"
                      className="size-48 sm:size-56"
                    />
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs text-neutral-500">
                    <Smartphone className="size-4" />
                    Google Authenticator, Authy o 1Password
                  </div>
                </div>

                {/* Lado Instrucciones y Código */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-ink">
                      ¿No podés escanear el código QR?
                    </h4>
                    <p className="mt-1 text-xs text-neutral-600">
                      Ingresá esta clave manualmente en tu app de autenticación:
                    </p>
                    <div className="mt-2 flex items-center gap-2 rounded-xl border border-neutral-200 bg-canvas px-3 py-2 font-mono text-xs">
                      <span className="flex-1 truncate tracking-wider">{setupData.secret}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(setupData.secret, setCopiedSecret)}
                        className="flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-brand hover:bg-brand/10"
                      >
                        {copiedSecret ? <Check className="size-3" /> : <Copy className="size-3" />}
                        {copiedSecret ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleConfirmSetup} className="space-y-4">
                    <Field
                      label="Código de verificación de 6 dígitos"
                      htmlFor="confirm-code"
                      hint="Ingresá los 6 números que muestra tu app para confirmar"
                    >
                      <Input
                        id="confirm-code"
                        name="confirmCode"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        autoFocus
                        required
                        placeholder="000000"
                        value={confirmCode}
                        onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ''))}
                        className="text-center font-mono text-xl tracking-[0.25em]"
                      />
                    </Field>

                    {setupError && (
                      <Notice.p
                        role="alert"
                        className="rounded-xl bg-[#fdeaea] px-4 py-2.5 text-xs font-medium text-[#a52a2a]"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        {setupError}
                      </Notice.p>
                    )}

                    <div className="flex items-center gap-3 pt-2">
                      <Button type="submit" disabled={loading || confirmCode.length !== 6}>
                        {loading ? <Spinner className="size-4" /> : 'Confirmar y Activar'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep('idle')}
                        disabled={loading}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pantalla de Códigos de Respaldo */}
        <AnimatePresence>
          {step === 'showing_backup' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-8 border-t border-line pt-8"
            >
              <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-amber-900 border border-amber-200">
                <AlertTriangle className="size-5 shrink-0 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-bold">Guardá tus códigos de respaldo</p>
                  <p className="mt-1 text-xs text-amber-800">
                    Si perdés acceso a tu celular, estos códigos son la **única forma** de volver a
                    entrar a tu cuenta. Cada código sirve una sola vez. No se volverán a mostrar.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {backupCodes.map((code) => (
                  <div
                    key={code}
                    className="flex items-center justify-center rounded-xl border border-neutral-200 bg-canvas py-2.5 font-mono text-sm font-bold tracking-wider text-ink"
                  >
                    {code}
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(backupCodes.join('\n'), setCopiedCodes)}
                  className="flex items-center gap-1.5"
                >
                  {copiedCodes ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copiedCodes ? 'Copiados' : 'Copiar todos'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadBackupCodes}
                  className="flex items-center gap-1.5"
                >
                  <Download className="size-4" />
                  Descargar (.txt)
                </Button>
                <Button size="sm" onClick={() => setStep('idle')} className="ml-auto">
                  Entendido, ya los guardé
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal/Paso para Desactivar */}
        <AnimatePresence>
          {step === 'disabling' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-8 border-t border-line pt-8"
            >
              <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6">
                <h3 className="text-base font-bold text-rose-900">
                  ¿Estás seguro de desactivar la autenticación en dos pasos?
                </h3>
                <p className="mt-1 text-xs text-rose-700">
                  Tu cuenta volverá a estar protegida únicamente por tu contraseña. Ingresá el
                  código actual de tu app para confirmar la desactivación.
                </p>

                <form onSubmit={handleDisable} className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
                  <div className="sm:w-64">
                    <Field label="Código de 6 dígitos" htmlFor="disable-code">
                      <Input
                        id="disable-code"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        required
                        autoFocus
                        placeholder="000000"
                        value={disableCode}
                        onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                        className="text-center font-mono text-lg tracking-widest"
                      />
                    </Field>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="submit"
                      disabled={loading || disableCode.length !== 6}
                      className="bg-rose-600 hover:bg-rose-700 text-white"
                    >
                      {loading ? <Spinner className="size-4" /> : 'Confirmar desactivación'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep('idle')}
                      disabled={loading}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>

                {disableError && (
                  <p className="mt-3 text-xs font-semibold text-rose-600">{disableError}</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Aplicaciones recomendadas */}
      <div className="rounded-2xl border border-line bg-canvas p-6">
        <h3 className="text-sm font-bold text-ink">Aplicaciones recomendadas</h3>
        <p className="mt-1 text-xs text-neutral-600">
          Podés usar cualquier aplicación compatible con el estándar TOTP en tu teléfono o computadora:
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-neutral-200 bg-white p-3 text-xs">
            <p className="font-bold text-ink">Google Authenticator</p>
            <p className="mt-0.5 text-neutral-500">Android & iOS</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-3 text-xs">
            <p className="font-bold text-ink">1Password / Bitwarden</p>
            <p className="mt-0.5 text-neutral-500">Multiplataforma</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-3 text-xs">
            <p className="font-bold text-ink">Microsoft Authenticator</p>
            <p className="mt-0.5 text-neutral-500">Android & iOS</p>
          </div>
        </div>
      </div>
    </div>
  )
}
