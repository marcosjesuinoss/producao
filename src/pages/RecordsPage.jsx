import { useMemo, useState } from 'react'
import { Download, Send, Settings, Sparkles } from 'lucide-react'
import { useLiveQuery } from '../hooks/useLiveData.js'
import { db } from '../db/db.js'
import { deleteRecord, updateRecord } from '../api/localApi.js'
import { exportCsv } from '../lib/csv.js'
import { exportPdf } from '../lib/pdf.js'
import { dateBR, FULL_MONTHS } from '../lib/format.js'
import { buildProducaoPayload, periodSlug, downloadJSON } from '../lib/backup.js'
import { getTodayBreakdown, getImagemGerente, getImagemAgencia } from '../lib/producaoDia.js'
import { downloadProducaoDiaImage } from '../lib/producaoDiaImage.js'
import Filters from '../components/Filters.jsx'
import RecordList from '../components/RecordList.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import PeriodPicker from '../components/PeriodPicker.jsx'
import DownloadDialog from '../components/DownloadDialog.jsx'
import RegistroSettingsModal from '../components/RegistroSettingsModal.jsx'
import ProducaoDiaModal from '../components/ProducaoDiaModal.jsx'
import Toast from '../components/Toast.jsx'
import { useToast } from '../hooks/useToast.js'
import { useRecordModal } from '../context/RecordModalContext.jsx'
import { useMonth } from '../context/MonthContext.jsx'

// Descreve em texto o que os filtros ativos vao incluir no download.
const describeDownloadScope = (filters, month, year) => {
  const monthLabel = `${FULL_MONTHS[Number(month) - 1]} de ${year}`
  const parts = []
  if (filters.product) parts.push(`de ${filters.product}`)
  if (filters.account) parts.push(`da conta ${filters.account}`)
  const escopo = parts.length > 0 ? `a produção ${parts.join(' ')}` : null

  if (filters.date) return `${escopo ?? 'a produção'} do dia ${dateBR(filters.date)}`
  return `${escopo ?? 'toda a produção'} de ${monthLabel}`
}

// Titulo curto pro cabecalho do relatorio PDF (sem "a produção de...").
const describeReportTitle = (filters, month, year) => {
  const monthLabel = `${FULL_MONTHS[Number(month) - 1]} de ${year}`
  const parts = []
  if (filters.product) parts.push(filters.product)
  if (filters.account) parts.push(`conta ${filters.account}`)
  const escopo = parts.length > 0 ? parts.join(' · ') : 'Toda a produção'

  if (filters.date) return `${escopo} — ${dateBR(filters.date)}`
  return `${escopo} de ${monthLabel}`
}

export default function RecordsPage() {
  const { open } = useRecordModal()
  const { year, month } = useMonth()
  const [filters, setFilters] = useState({})
  const [sortMode, setSortMode] = useState('date') // 'date' | 'value-desc' | 'value-asc'
  const [deleteTarget, setDeleteTarget] = useState(null) // registro pendente de exclusao
  const [showSendPicker, setShowSendPicker] = useState(false)
  const [sendRecords, setSendRecords] = useState(null)
  const [showDownloadWarning, setShowDownloadWarning] = useState(false)
  const [showRegistroSettings, setShowRegistroSettings] = useState(false)
  const [producaoDiaBreakdown, setProducaoDiaBreakdown] = useState(null) // null = fechado
  const { toast, showToast, hideToast } = useToast()

  const all = useLiveQuery(
    () => db.records.where({ year: Number(year), month: Number(month) }).reverse().sortBy('date'),
    [year, month], []
  )
  const accounts = useMemo(() => [...new Set(all.map((r) => r.account).filter(Boolean))], [all])

  const records = useMemo(() => {
    const filtered = all.filter((r) => {
      if (filters.date && r.date !== filters.date) return false
      if (filters.product && r.product !== filters.product) return false
      if (filters.account && r.account !== filters.account) return false
      return true
    })
    if (sortMode === 'date') return filtered
    // "valor" usa o valor em R$ quando o produto tem; produtos por quantidade
    // (sem valor) usam a quantidade no lugar, pra sempre ter um numero pra comparar.
    const amount = (r) => (r.value != null && r.value > 0 ? r.value : r.quantity || 0)
    const sorted = [...filtered].sort((a, b) => amount(b) - amount(a))
    if (sortMode === 'value-asc') sorted.reverse()
    return sorted
  }, [all, filters, sortMode])

  // Ignorados continuam visiveis na lista (pra poder desfazer o "ignorar"),
  // mas nao devem contar nos relatorios exportados — mesmo filtro que ja
  // vale pras metas em summaries.js/evolucao.js.
  const exportableRecords = useMemo(
    () => records.filter((r) => !r.ignored),
    [records]
  )

  const handleDelete = (r) => setDeleteTarget(r)

  const handleDeleteConfirm = async () => {
    try {
      await deleteRecord(deleteTarget.id)
      setDeleteTarget(null)
    } catch (err) {
      showToast(`Erro ao excluir: ${err?.message || err}`, 'error')
    }
  }

  const handleIgnore = async (r, ignored) => {
    try {
      await updateRecord(r.id, { ignored })
    } catch (err) {
      showToast(`Erro ao atualizar: ${err?.message || err}`, 'error')
    }
  }

  // Pre-carrega os registros ANTES de mostrar o seletor de periodo, pra que
  // confirmar o periodo leve direto ao navigator.share() sem nenhum "await"
  // no meio (o Android invalida o gesto do usuario se demorar).
  const handleOpenSendPicker = async () => {
    setSendRecords(await db.records.toArray())
    setShowSendPicker(true)
  }

  // Sincrona de proposito ate a chamada do share() — ver handleOpenSendPicker.
  const handleSendProducao = (period) => {
    setShowSendPicker(false)
    const payload = buildProducaoPayload(sendRecords, period)
    const filename = `producao-${periodSlug(period)}.json`

    const fallbackToDownload = () => {
      downloadJSON(payload, filename)
      showToast('Arquivo baixado — anexe no WhatsApp manualmente.')
    }

    try {
      // O Web Share API do Android so aceita compartilhar arquivo cuja
      // EXTENSAO e tipo batam com uma lista especifica de combinacoes
      // seguras — ".json" nao esta nela, mesmo com type "text/plain".
      // ".txt" + "text/plain" esta. O conteudo (JSON valido) nao muda,
      // so o nome usado nessa tentativa de compartilhamento.
      const shareFilename = filename.replace(/\.json$/, '.txt')
      const file = new File([JSON.stringify(payload, null, 2)], shareFilename, { type: 'text/plain' })
      if (navigator.canShare?.({ files: [file] })) {
        navigator.share({ files: [file], title: 'Produção enviada' }).catch((e) => {
          if (e.name !== 'AbortError') fallbackToDownload() // AbortError = usuario cancelou
        })
        return
      }
    } catch {
      // canShare lancou — cai pro download abaixo
    }

    fallbackToDownload()
  }

  const handleProducaoDiaClick = async () => {
    const breakdown = await getTodayBreakdown()
    if (breakdown.totalRecords === 0) {
      showToast('Não houve registros hoje', 'error')
      return
    }
    setProducaoDiaBreakdown(breakdown)
  }

  const handleProducaoDiaConfirm = () => {
    downloadProducaoDiaImage({
      breakdown: producaoDiaBreakdown,
      gerente: getImagemGerente(),
      agencia: getImagemAgencia(),
    })
    setProducaoDiaBreakdown(null)
    showToast('Imagem gerada.')
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Registros</h2>
        <div className="flex items-center gap-2">
          <button
            className="btn flex items-center gap-1.5"
            onClick={handleOpenSendPicker}
          >
            <Send size={16} />
            Enviar
          </button>
          <button
            className="btn flex items-center gap-1.5"
            onClick={() => setShowDownloadWarning(true)}
          >
            <Download size={16} />
            Baixar
          </button>
          <button
            className="btn px-2.5"
            onClick={() => setShowRegistroSettings(true)}
            aria-label="Ajuste de registro"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      <Toast toast={toast} onDismiss={hideToast} />

      {showRegistroSettings && (
        <RegistroSettingsModal onClose={() => setShowRegistroSettings(false)} />
      )}

      {producaoDiaBreakdown && (
        <ProducaoDiaModal
          breakdown={producaoDiaBreakdown}
          onConfirm={handleProducaoDiaConfirm}
          onCancel={() => setProducaoDiaBreakdown(null)}
        />
      )}

      <Filters value={filters} onChange={setFilters} accounts={accounts} sortMode={sortMode} onSortChange={setSortMode} />

      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Quantidade de registros: <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{records.length}</span>
        </p>
        <button
          className="btn text-xs px-2.5 py-1.5 flex items-center gap-1.5 shrink-0"
          onClick={handleProducaoDiaClick}
        >
          <Sparkles size={13} />
          Produção do dia
        </button>
      </div>

      <RecordList records={records} onEdit={(r) => open(r)} onDelete={handleDelete} onIgnore={handleIgnore} groupByDate={sortMode === 'date'} />

      {deleteTarget && (
        <ConfirmDialog
          title="Excluir registro"
          description={`Excluir registro de ${deleteTarget.product} em ${dateBR(deleteTarget.date)}?`}
          confirmLabel="Excluir"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {showSendPicker && (
        <PeriodPicker
          title="Enviar produção"
          dayOption
          onConfirm={handleSendProducao}
          onCancel={() => setShowSendPicker(false)}
        />
      )}

      {showDownloadWarning && (
        <DownloadDialog
          title="Baixar produção"
          description={`Você está baixando ${describeDownloadScope(filters, month, year)}.`}
          onDownloadCsv={() => { setShowDownloadWarning(false); exportCsv(exportableRecords, 'producao-filtrada.csv') }}
          onDownloadPdf={() => { setShowDownloadWarning(false); exportPdf(exportableRecords, describeReportTitle(filters, month, year), 'producao-filtrada.pdf') }}
          onCancel={() => setShowDownloadWarning(false)}
        />
      )}
    </section>
  )
}
