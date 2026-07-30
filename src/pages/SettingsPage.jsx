import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Sun, Moon, MoonStar, Trash2, Lock, RefreshCw, Target, Layers, Download, Upload, Info } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { seedIfEmpty, resetAll } from '../lib/seed.js'
import { exportBackup, readImportFile, importBackup, importMerge, describePeriod, findContentDuplicates } from '../lib/backup.js'
import { getAgenciaEnabled, setAgenciaEnabled, getAgenciaDefault, setAgenciaDefault, getDigitoEnabled, setDigitoEnabled } from '../lib/agencia.js'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import PeriodPicker from '../components/PeriodPicker.jsx'
import DuplicateReview from '../components/DuplicateReview.jsx'
import Toast from '../components/Toast.jsx'
import { useToast } from '../hooks/useToast.js'

// Botão "i" com popup centralizado na tela (mesmo padrão dos outros popups
// do app — portal pro <body>, fixed inset-0 + flex center — em vez de
// ancorado no proprio botao, que estourava a borda da tela quando o botao
// ficava perto da direita). Tom indigo (cor "marca" do app) em vez do verde
// do toast: aqui nao e uma confirmacao de sucesso, e so uma informacao.
function InfoButton({ id, description, open, onToggle }) {
  const isOpen = open === id
  return (
    <>
      <button
        type="button"
        onClick={() => onToggle(isOpen ? null : id)}
        aria-label="O que é isso?"
        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
        style={{ background: 'var(--bg-card-deep)', color: 'var(--text-faint)' }}
      >
        <Info size={12} />
      </button>
      {isOpen && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => onToggle(null)}
        >
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }} aria-hidden />
          <div
            role="status"
            className="relative w-full max-w-sm p-4 shadow-lg"
            style={{
              backgroundColor: 'var(--c-surface)',
              backgroundImage: 'linear-gradient(rgba(99,102,241,0.12), rgba(99,102,241,0.12))',
              border: '1.5px solid var(--c-brand)',
              borderRadius: '14px',
              fontSize: '14px',
              lineHeight: '1.5',
              color: 'var(--text-primary)',
            }}
          >
            {description}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()
  const { hasPin, setPin, removePin } = useAuth()
  const { theme, setTheme } = useTheme()
  const [pin, setPinValue] = useState('')
  const { toast, showToast, hideToast } = useToast()
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [showRemovePinDialog, setShowRemovePinDialog] = useState(false)
  const [showExportPicker, setShowExportPicker] = useState(false)
  const [showImportWarning, setShowImportWarning] = useState(false)
  const [showProducaoWarning, setShowProducaoWarning] = useState(false)
  const [importPayload, setImportPayload] = useState(null)
  const [producaoPayload, setProducaoPayload] = useState(null)
  const [duplicateReview, setDuplicateReview] = useState(null) // { payload, matches, label, errorMsg }
  const [agenciaEnabled, setAgenciaEnabledState] = useState(getAgenciaEnabled())
  const [agenciaValue, setAgenciaValue] = useState(getAgenciaDefault())
  const [digitoEnabled, setDigitoEnabledState] = useState(getDigitoEnabled())
  const [infoOpen, setInfoOpen] = useState(null) // null | 'agencia' | 'digito'
  const fileInputRef = useRef(null)
  const producaoInputRef = useRef(null)

  // Chegando via o botão de engrenagem do campo "Agência / Conta do produto"
  // (RecordForm.jsx) — rola direto pro bloco Registro.
  useEffect(() => {
    if (window.location.hash === '#registro') {
      document.getElementById('registro')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const handleUpdate = () => {
    if (needRefresh) updateServiceWorker(true)
    else window.location.reload()
  }

  const themeBtnStyle = (active) => ({
    flex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '0.5em 0.75em',
    fontSize: '0.875em',
    fontWeight: 500,
    borderRadius: '12px',
    border: active ? '1px solid #818cf8' : '1px solid var(--input-border)',
    background: active ? 'rgba(99,102,241,0.1)' : 'var(--bg-card-deep)',
    color: active ? '#818cf8' : 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  })

  const handleClearConfirm = async () => {
    try {
      await resetAll()
      setShowClearDialog(false)
      showToast('Tudo apagado.')
    } catch (err) {
      showToast(`Erro ao apagar: ${err?.message || err}`, 'error')
    }
  }

  const handleExportConfirm = async (period) => {
    setShowExportPicker(false)
    try {
      await exportBackup(period)
      showToast('Backup exportado.')
    } catch {
      showToast('Erro ao exportar backup.', 'error')
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const payload = await readImportFile(file)
      if (payload.kind !== 'backup') {
        showToast('Esse arquivo não é um backup — use "Carregar produção enviada".', 'error')
        return
      }
      setImportPayload(payload)
    } catch {
      showToast('Arquivo de backup inválido.', 'error')
    }
  }

  // Verifica duplicatas de CONTEUDO (mesma data/conta/produto/valor, id novo)
  // antes de mesclar; se achar alguma, abre a tela de revisao em vez de
  // importar direto. Usado tanto por backup parcial quanto por producao.
  const mergeWithDuplicateCheck = async (payload, label, errorMsg) => {
    try {
      const matches = await findContentDuplicates(payload.data.records ?? [])
      if (matches.length) {
        setDuplicateReview({ payload, matches, label, errorMsg })
        return
      }
      await runMerge(payload, null, label, errorMsg)
    } catch {
      showToast(errorMsg, 'error')
    }
  }

  const runMerge = async (payload, skipIds, label, errorMsg) => {
    try {
      const result = await importMerge(payload, skipIds)
      const imported = Object.values(result).reduce((s, r) => s + r.imported, 0)
      const skipped = Object.values(result).reduce((s, r) => s + r.skipped, 0)
      showToast(skipped > 0 ? `${imported} ${label} importados, ${skipped} já existiam.` : `${imported} ${label} importados.`)
    } catch {
      showToast(errorMsg, 'error')
    }
  }

  const handleImportConfirm = async () => {
    const payload = importPayload
    setImportPayload(null)
    if (payload.period.type === 'tudo') {
      try {
        await importBackup(payload)
        showToast('Backup restaurado.')
      } catch {
        showToast('Erro ao restaurar backup.', 'error')
      }
      return
    }
    await mergeWithDuplicateCheck(payload, 'itens', 'Erro ao restaurar backup.')
  }

  const handleProducaoFileChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const payload = await readImportFile(file)
      if (payload.kind !== 'producao') {
        showToast('Esse arquivo é um backup — use "Importar backup".', 'error')
        return
      }
      setProducaoPayload(payload)
    } catch {
      showToast('Arquivo inválido.', 'error')
    }
  }

  const handleProducaoConfirm = async () => {
    const payload = producaoPayload
    setProducaoPayload(null)
    await mergeWithDuplicateCheck(payload, 'registros', 'Erro ao importar produção.')
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
              borderRadius: '12px',
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
              borderRadius: '12px',
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
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => setTheme('light')} style={themeBtnStyle(theme === 'light')}>
            <Sun size={14} />
            Claro
          </button>
          <button onClick={() => setTheme('midnight')} style={themeBtnStyle(theme === 'midnight')}>
            <MoonStar size={14} />
            Anoitecer
          </button>
          <button onClick={() => setTheme('dark')} style={themeBtnStyle(theme === 'dark')}>
            <Moon size={14} />
            Escuro
          </button>
        </div>
      </div>

      {/* Registro */}
      <div className="card space-y-3" id="registro">
        <h3 className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Registros</h3>
        <div className="flex items-center gap-2">
          <label className="switch">
            <input
              id="s-agencia-enabled"
              type="checkbox"
              checked={agenciaEnabled}
              onChange={(e) => {
                const v = e.target.checked
                setAgenciaEnabledState(v)
                setAgenciaEnabled(v)
              }}
            />
            <span className="switch-track" aria-hidden />
          </label>
          <label
            htmlFor="s-agencia-enabled"
            className="text-sm font-medium cursor-pointer select-none"
            style={{ color: 'var(--text-secondary)' }}
          >
            Solicitar agência nos registros
          </label>
          <InfoButton
            id="agencia"
            open={infoOpen}
            onToggle={setInfoOpen}
            description='Quando ativado, o campo "Agência / Conta do produto" separa os 4 primeiros dígitos digitados como agência e o resto como conta. Se você definir uma agência abaixo, ela vem pré-preenchida em todo registro novo — mas dá pra apagar na hora, se precisar.'
          />
        </div>
        <div className="flex items-center gap-2">
          {/* Espaçador do mesmo tamanho do switch (.switch = 42px) — alinha
              "Minha agência" na mesma coluna dos rótulos "Solicitar..." */}
          <div style={{ width: '42px' }} aria-hidden />
          <label htmlFor="s-agencia-value" className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Minha agência
          </label>
          <input
            id="s-agencia-value"
            type="text"
            inputMode="numeric"
            className="input !w-24"
            placeholder="1234"
            disabled={!agenciaEnabled}
            style={!agenciaEnabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
            value={agenciaValue}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 4)
              setAgenciaValue(digits)
              setAgenciaDefault(digits)
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="switch">
            <input
              id="s-digito-enabled"
              type="checkbox"
              checked={digitoEnabled}
              onChange={(e) => {
                const v = e.target.checked
                setDigitoEnabledState(v)
                setDigitoEnabled(v)
              }}
            />
            <span className="switch-track" aria-hidden />
          </label>
          <label
            htmlFor="s-digito-enabled"
            className="text-sm font-medium cursor-pointer select-none"
            style={{ color: 'var(--text-secondary)' }}
          >
            Solicitar dígito nas contas
          </label>
          <InfoButton
            id="digito"
            open={infoOpen}
            onToggle={setInfoOpen}
            description='Ativado (padrão), a conta exige um dígito verificador depois do "-" (ex: 1-2). Desativado, a conta aceita só números, sem dígito nem separador (ex: 12).'
          />
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
              onClick={async () => {
                try {
                  await setPin(pin)
                  setPinValue('')
                  showToast('PIN definido.')
                } catch (err) {
                  showToast(`Erro ao definir PIN: ${err?.message || err}`, 'error')
                }
              }}
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
        <div className="grid grid-cols-2 gap-2">
          <button className="btn flex items-center gap-1.5" onClick={() => setShowExportPicker(true)}>
            <Download size={14} />
            Exportar backup
          </button>
          <button className="btn flex items-center gap-1.5" onClick={() => setShowImportWarning(true)}>
            <Upload size={14} />
            Importar backup
          </button>
        </div>
        <div className="flex gap-2">
          <button
            className="btn flex items-center gap-1.5"
            style={{ flex: 1, minWidth: 0 }}
            onClick={() => setShowProducaoWarning(true)}
          >
            <Upload size={14} />
            Carregar produção enviada
          </button>
          <button
            className="btn btn-danger flex items-center gap-1.5"
            style={{ flexShrink: 0 }}
            onClick={() => setShowClearDialog(true)}
          >
            <Trash2 size={14} />
            Limpar tudo
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <input
          ref={producaoInputRef}
          type="file"
          accept="application/json,.json,.txt"
          style={{ display: 'none' }}
          onChange={handleProducaoFileChange}
        />
      </div>

      <Toast toast={toast} onDismiss={hideToast} />

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

      {showImportWarning && (
        <ConfirmDialog
          title="Importar backup"
          description={'Se o arquivo for um backup "Tudo", isso vai SUBSTITUIR todos os dados atuais; se for de um período específico (mês/semestre/ano), soma ao que já existe. Se o objetivo é sempre somar uma produção enviada por alguém, use "Carregar produção enviada" em vez disso.'}
          confirmLabel="Escolher arquivo"
          confirmIcon={Upload}
          onConfirm={() => { setShowImportWarning(false); fileInputRef.current?.click() }}
          onCancel={() => setShowImportWarning(false)}
        />
      )}

      {showProducaoWarning && (
        <ConfirmDialog
          title="Carregar produção enviada"
          description={'Isso vai SOMAR os registros do arquivo à sua produção atual, sem apagar nada. Se o objetivo é substituir todos os dados por um backup, use "Importar backup" em vez disso.'}
          confirmLabel="Escolher arquivo"
          confirmIcon={Upload}
          onConfirm={() => { setShowProducaoWarning(false); producaoInputRef.current?.click() }}
          onCancel={() => setShowProducaoWarning(false)}
        />
      )}

      {importPayload && (() => {
        const isFull = importPayload.period.type === 'tudo'
        const recordCount = importPayload.data.records?.length ?? 0
        const goalCount = importPayload.data.goals?.length ?? 0
        const resumo = `Importando ${describePeriod(importPayload.period)} — ${recordCount} registros e ${goalCount} metas.`
        const aviso = isFull
          ? ' Os dados atuais serão substituídos — essa ação não pode ser desfeita.'
          : ' Isso será somado à sua produção atual e não pode ser desfeito depois.'
        return (
          <ConfirmDialog
            title="Importar backup"
            description={resumo + aviso}
            confirmLabel={isFull ? 'Confirmar restauração' : 'Continuar'}
            confirmIcon={Upload}
            countdown={isFull ? 5 : 0}
            onConfirm={handleImportConfirm}
            onCancel={() => setImportPayload(null)}
          />
        )
      })()}

      {producaoPayload && (
        <ConfirmDialog
          title="Carregar produção enviada"
          description={`Importando ${describePeriod(producaoPayload.period)} — ${producaoPayload.data.records?.length ?? 0} registros. Isso será somado à sua produção atual e não pode ser desfeito depois.`}
          confirmLabel="Continuar"
          confirmIcon={Upload}
          onConfirm={handleProducaoConfirm}
          onCancel={() => setProducaoPayload(null)}
        />
      )}

      {duplicateReview && (
        <DuplicateReview
          matches={duplicateReview.matches}
          onCancel={() => setDuplicateReview(null)}
          onConfirm={(skipIds) => {
            const { payload, label, errorMsg } = duplicateReview
            setDuplicateReview(null)
            runMerge(payload, skipIds, label, errorMsg)
          }}
        />
      )}

      {showExportPicker && (
        <PeriodPicker
          title="Exportar backup"
          onConfirm={handleExportConfirm}
          onCancel={() => setShowExportPicker(false)}
        />
      )}

      {showRemovePinDialog && (
        <ConfirmDialog
          title="Remover PIN"
          description="O app deixará de pedir PIN ao abrir — qualquer pessoa com acesso ao aparelho poderá ver seus dados de produção."
          confirmLabel="Remover"
          confirmIcon={Lock}
          onConfirm={() => { removePin(); setShowRemovePinDialog(false); showToast('PIN removido.') }}
          onCancel={() => setShowRemovePinDialog(false)}
        />
      )}
    </section>
  )
}
