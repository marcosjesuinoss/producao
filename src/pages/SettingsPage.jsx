import { useRef, useState } from 'react'
import { Sun, Moon, Trash2, Lock, RefreshCw, Target, Layers, Download, Upload } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { seedIfEmpty, resetAll } from '../lib/seed.js'
import { exportBackup, readBackupFile, importBackup } from '../lib/backup.js'
import ConfirmDialog from '../components/ConfirmDialog.jsx'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()
  const { hasPin, setPin, removePin } = useAuth()
  const { theme, setTheme } = useTheme()
  const [pin, setPinValue] = useState('')
  const [msg, setMsg] = useState('')
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [showRemovePinDialog, setShowRemovePinDialog] = useState(false)
  const [importPayload, setImportPayload] = useState(null)
  const fileInputRef = useRef(null)

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

  const handleExport = async () => {
    try {
      await exportBackup()
      flash('Backup exportado.')
    } catch {
      flash('Erro ao exportar backup.')
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setImportPayload(await readBackupFile(file))
    } catch {
      flash('Arquivo de backup inválido.')
    }
  }

  const handleImportConfirm = async () => {
    try {
      await importBackup(importPayload)
      flash('Backup restaurado.')
    } catch {
      flash('Erro ao restaurar backup.')
    } finally {
      setImportPayload(null)
    }
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
            Gerenciar metas
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
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setTheme('light')}
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
            <Sun size={14} />
            Modo claro
          </button>
          <button
            onClick={() => setTheme('dark')}
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
              border: isDark ? '1px solid #818cf8' : '1px solid var(--input-border)',
              background: isDark ? 'rgba(99,102,241,0.1)' : 'var(--bg-card-deep)',
              color: isDark ? '#818cf8' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <Moon size={14} />
            Modo escuro
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
          <button className="btn" onClick={() => setShowRemovePinDialog(true)}>
            Remover PIN
          </button>
        )}
      </div>

      {/* Dados */}
      <div className="card space-y-3">
        <h3 className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Dados</h3>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          O backup salva registros, metas, produtos e grupos num arquivo local — guarde-o em local seguro (e-mail, nuvem) para não perder os dados caso o app seja desinstalado ou o navegador limpe o armazenamento.
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="btn flex items-center gap-1.5" onClick={handleExport}>
            <Download size={14} />
            Exportar backup
          </button>
          <button className="btn flex items-center gap-1.5" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} />
            Importar backup
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
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
        <ConfirmDialog
          title="Limpar todos os dados"
          description="Registros e metas serão apagados permanentemente."
          confirmLabel="Confirmar exclusão"
          countdown={5}
          onConfirm={handleClearConfirm}
          onCancel={() => setShowClearDialog(false)}
        />
      )}

      {importPayload && (
        <ConfirmDialog
          title="Restaurar backup"
          description={`Os dados atuais serão substituídos por ${importPayload.data.records?.length ?? 0} registros e ${importPayload.data.goals?.length ?? 0} metas deste arquivo.`}
          confirmLabel="Confirmar restauração"
          confirmIcon={Upload}
          countdown={5}
          onConfirm={handleImportConfirm}
          onCancel={() => setImportPayload(null)}
        />
      )}

      {showRemovePinDialog && (
        <ConfirmDialog
          title="Remover PIN"
          description="O app deixará de pedir PIN ao abrir — qualquer pessoa com acesso ao aparelho poderá ver seus dados de produção."
          confirmLabel="Remover"
          confirmIcon={Lock}
          onConfirm={() => { removePin(); setShowRemovePinDialog(false); flash('PIN removido.') }}
          onCancel={() => setShowRemovePinDialog(false)}
        />
      )}
    </section>
  )
}
