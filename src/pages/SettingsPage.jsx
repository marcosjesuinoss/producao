import { useEffect, useState } from 'react'
import { Sun, Moon, Trash2, Lock, AlertTriangle, RefreshCw, Target, Layers } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { seedIfEmpty, resetAll } from '../lib/seed.js'

const COUNTDOWN = 5

function ClearConfirmDialog({ onConfirm, onCancel }) {
  const [seconds, setSeconds] = useState(COUNTDOWN)

  useEffect(() => {
    if (seconds <= 0) return
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [seconds])

  const ready = seconds === 0
  const progress = ((COUNTDOWN - seconds) / COUNTDOWN) * 100

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
        onClick={onCancel}
        aria-hidden
      />

      <div
        className="relative w-full max-w-sm space-y-5 p-6"
        style={{ background: 'var(--c-surface)', borderRadius: '20px', boxShadow: '0 24px 48px rgba(0,0,0,0.4)' }}
      >
        {/* Ícone + título */}
        <div className="flex items-center gap-3">
          <div style={{ background: 'rgba(239,68,68,0.12)', borderRadius: '10px', padding: '8px', flexShrink: 0 }}>
            <AlertTriangle size={22} style={{ color: 'var(--accent-red)' }} />
          </div>
          <div>
            <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Limpar todos os dados</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Registros e metas serão apagados permanentemente.
            </p>
          </div>
        </div>

        {/* Countdown */}
        <div className="text-center space-y-2">
          {!ready ? (
            <>
              <span className="text-5xl font-bold tabular-nums" style={{ color: 'var(--accent-red)' }}>
                {seconds}
              </span>
              <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Aguarde para poder confirmar…</p>
            </>
          ) : (
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Pronto. Confirme para apagar tudo.
            </p>
          )}

          {/* Barra de progresso do timer */}
          <div style={{ height: '4px', width: '100%', background: 'var(--bg-bar)', borderRadius: '99px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: ready ? 'var(--accent-red)' : 'var(--accent-yellow)',
                borderRadius: '0 99px 99px 0',
                transition: 'width 0.9s linear',
              }}
            />
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-2">
          <button className="btn flex-1" onClick={onCancel}>
            Cancelar
          </button>
          <button
            className="btn btn-danger flex-1 flex items-center justify-center gap-1.5"
            disabled={!ready}
            onClick={onConfirm}
            style={{ opacity: ready ? 1 : 0.35, cursor: ready ? 'pointer' : 'not-allowed' }}
          >
            <Trash2 size={14} />
            {ready ? 'Confirmar exclusão' : `Aguarde (${seconds})`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()
  const { hasPin, setPin, removePin } = useAuth()
  const { theme, toggleTheme, fontScale, setFontScale } = useTheme()
  const [pin, setPinValue] = useState('')
  const [msg, setMsg] = useState('')
  const [showClearDialog, setShowClearDialog] = useState(false)

  const handleUpdate = () => {
    if (needRefresh) updateServiceWorker(true)
    else window.location.reload()
  }

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 2500) }

  const isDark = theme === 'dark'

  const handleClearConfirm = async () => {
    await resetAll()
    setShowClearDialog(false)
    flash('Tudo apagado.')
  }

  return (
    <section className="space-y-4 max-w-xl">
      <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Ajustes</h2>

      {/* Metas */}
      <div className="card space-y-3">
        <h3 className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Metas</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => navigate('/metas')}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '0.5em 0.75em',
              fontSize: '0.875em',
              fontWeight: 500,
              borderRadius: '8px',
              border: '1px solid var(--input-border)',
              background: 'var(--bg-card-deep)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <Target size={14} />
            Definir metas
          </button>
          <button
            onClick={() => navigate('/grupos')}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '0.5em 0.75em',
              fontSize: '0.875em',
              fontWeight: 500,
              borderRadius: '8px',
              border: '1px solid var(--input-border)',
              background: 'var(--bg-card-deep)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <Layers size={14} />
            Gerenciar grupos
          </button>
        </div>
      </div>

      {/* Aparência */}
      <div className="card space-y-3">
        <h3 className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Aparência</h3>
        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
          <button
            onClick={toggleTheme}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '0.5em 0.75em',
              fontSize: '0.875em',
              fontWeight: 500,
              borderRadius: '8px',
              border: !isDark ? '1px solid #818cf8' : '1px solid var(--input-border)',
              background: !isDark ? 'rgba(99,102,241,0.1)' : 'var(--bg-card-deep)',
              color: !isDark ? '#818cf8' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
            {isDark ? 'Tema claro' : 'Tema escuro'}
          </button>

          <button
            onClick={() => setFontScale(Math.max(0.9, +(fontScale - 0.1).toFixed(2)))}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.5em 0.75em',
              fontSize: '0.875em',
              fontWeight: 500,
              borderRadius: '8px',
              border: '1px solid var(--input-border)',
              background: 'var(--bg-card-deep)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
            aria-label="Diminuir fonte"
          >
            A− Menor
          </button>

          <button
            onClick={() => setFontScale(Math.min(1.4, +(fontScale + 0.1).toFixed(2)))}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.5em 0.75em',
              fontSize: '0.875em',
              fontWeight: 500,
              borderRadius: '8px',
              border: '1px solid var(--input-border)',
              background: 'var(--bg-card-deep)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
            aria-label="Aumentar fonte"
          >
            A+ Maior
          </button>
        </div>
      </div>

      {/* Notificações */}
      <div className="card space-y-3">
        <h3 className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Notificações</h3>
        <p className="text-sm" style={{ color: 'var(--text-faint)' }}>Em breve</p>
      </div>

      {/* Aplicativo */}
      <div className="card space-y-3">
        <h3 className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Aplicativo</h3>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Versão do app</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>
              {needRefresh ? 'Nova versão disponível' : 'App atualizado'}
            </p>
          </div>
          <button
            className={`btn flex items-center gap-1.5 shrink-0 ${needRefresh ? 'btn-brand' : ''}`}
            onClick={handleUpdate}
          >
            <RefreshCw size={14} />
            {needRefresh ? 'Atualizar agora' : 'Verificar'}
          </button>
        </div>
      </div>

      {/* Segurança */}
      <div className="card space-y-3">
        <h3 className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Segurança (PIN local opcional)
        </h3>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Se definido, o app exige o PIN toda vez que for aberto — útil para impedir que outras pessoas vejam seus dados de produção.
        </p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          O PIN é armazenado apenas neste dispositivo como um hash SHA-256: nem o app guarda o número em si, somente uma "impressão digital" dele. Nenhum dado é enviado para servidores.
        </p>
        {!hasPin ? (
          <div className="flex gap-2">
            <input
              type="password"
              inputMode="numeric"
              className="input"
              placeholder="Defina um PIN"
              value={pin}
              onChange={(e) => setPinValue(e.target.value)}
              aria-label="Novo PIN"
            />
            <button
              className="btn btn-brand flex items-center gap-1.5"
              disabled={pin.length < 4}
              onClick={async () => { await setPin(pin); setPinValue(''); flash('PIN definido.') }}
            >
              <Lock size={14} />
              Definir
            </button>
          </div>
        ) : (
          <button className="btn" onClick={() => { removePin(); flash('PIN removido.') }}>
            Remover PIN
          </button>
        )}
      </div>

      {/* Dados */}
      <div className="card space-y-3">
        <h3 className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Dados</h3>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn btn-danger flex items-center gap-1.5"
            onClick={() => setShowClearDialog(true)}
          >
            <Trash2 size={14} />
            Limpar tudo
          </button>
        </div>
      </div>

      {msg && (
        <p className="text-sm" style={{ color: 'var(--accent-green)' }} role="status">{msg}</p>
      )}

      {showClearDialog && (
        <ClearConfirmDialog
          onConfirm={handleClearConfirm}
          onCancel={() => setShowClearDialog(false)}
        />
      )}
    </section>
  )
}
