import { useEffect, useRef, useState } from 'react'
import { Sun, Moon, MoonStar, Trash2, Lock, RefreshCw, Target, Layers, Download, Upload } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { useAccent } from '../context/AccentContext.jsx'
import { ACCENTS, ACCENT_ORDER, resolveAccentTones } from '../lib/accents.js'
import { resetAll } from '../lib/seed.js'
import { exportBackup, readImportFile, importBackup, importMerge, describePeriod, findContentDuplicates } from '../lib/backup.js'
import { getProjecaoEnabled, setProjecaoEnabled, getMarcador90Enabled, setMarcador90Enabled } from '../lib/chartSettings.js'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import PeriodPicker from '../components/PeriodPicker.jsx'
import DuplicateReview from '../components/DuplicateReview.jsx'
import Toast from '../components/Toast.jsx'
import InfoButton from '../components/InfoButton.jsx'
import RegistroSettingsFields from '../components/RegistroSettingsFields.jsx'
import GraficosSettingsFields from '../components/GraficosSettingsFields.jsx'
import { useToast } from '../hooks/useToast.js'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()
  const { hasPin, setPin, removePin } = useAuth()
  const { theme, setTheme } = useTheme()
  const { accent, setAccent } = useAccent()
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
  const [projecaoEnabled, setProjecaoEnabledState] = useState(getProjecaoEnabled())
  const [marcador90Enabled, setMarcador90EnabledState] = useState(getMarcador90Enabled())
  const [infoOpen, setInfoOpen] = useState(null) // null | 'accent'
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

  // Sem borda: o estado selecionado usa preenchimento tingido mais forte +
  // texto em negrito + brilho colorido — pra ficar bem mais destacado que
  // o não-selecionado (--btn-bg/--shadow-btn, igual .btn).
  const themeBtnStyle = (active) => ({
    flex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '0.5em 0.75em',
    fontSize: '0.875em',
    fontWeight: active ? 700 : 500,
    borderRadius: '12px',
    background: active ? 'rgba(var(--c-brand-rgb),0.28)' : 'var(--btn-bg)',
    color: active ? 'var(--c-brand)' : 'var(--text-secondary)',
    boxShadow: active ? '0 2px 8px rgba(var(--c-brand-rgb),0.35)' : 'var(--shadow-btn)',
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

      {/* Aparência */}
      <div className="card space-y-3">
        <h3 className="block-title">Aparência</h3>
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

        <div className="flex items-center gap-2" style={{ marginTop: '16px' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Cor de destaque
          </span>
          <InfoButton
            id="accent"
            open={infoOpen}
            onToggle={setInfoOpen}
            description="Escolha a cor de destaque usada nos botões, abas ativas e realces do app inteiro."
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {ACCENT_ORDER.map((key) => {
            const tones = resolveAccentTones(key, theme)
            const isSelected = accent === key
            return (
              <button
                key={key}
                onClick={() => setAccent(key)}
                aria-pressed={isSelected}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '0.75em 0.5em',
                  fontSize: '0.875em',
                  fontWeight: isSelected ? 700 : 500,
                  borderRadius: '12px',
                  border: 'none',
                  background: `linear-gradient(135deg, ${tones.brand2}, ${tones.brand})`,
                  color: tones.fg,
                  transform: isSelected ? 'scale(1.04)' : 'scale(1)',
                  opacity: isSelected ? 1 : 0.8,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {ACCENTS[key].label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Metas */}
      <div className="card space-y-3">
        <h3 className="block-title">Metas</h3>
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
              background: 'var(--btn-bg)',
              boxShadow: 'var(--shadow-btn)',
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
              background: 'var(--btn-bg)',
              boxShadow: 'var(--shadow-btn)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <Layers size={14} />
            Gerenciar grupos
          </button>
        </div>
      </div>

      {/* Registro */}
      <div className="card space-y-3" id="registro">
        <h3 className="block-title">Registros</h3>
        <RegistroSettingsFields />
      </div>

      {/* Gráficos */}
      <div className="card space-y-3">
        <h3 className="block-title">Gráficos</h3>
        <GraficosSettingsFields
          projecaoEnabled={projecaoEnabled}
          marcador90Enabled={marcador90Enabled}
          onProjecaoChange={(v) => { setProjecaoEnabledState(v); setProjecaoEnabled(v) }}
          onMarcador90Change={(v) => { setMarcador90EnabledState(v); setMarcador90Enabled(v) }}
        />
      </div>

      {/* Notificações */}
      <div className="card space-y-3">
        <h3 className="block-title">Notificações</h3>
        <p className="text-sm" style={{ color: 'var(--text-faint)' }}>Em breve</p>
      </div>

      {/* Aplicativo */}
      <div className="card space-y-3">
        <h3 className="block-title">Aplicativo</h3>
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
        <h3 className="block-title">
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
        <h3 className="block-title">Dados</h3>
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
