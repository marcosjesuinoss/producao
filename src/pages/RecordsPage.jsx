import { useMemo, useState } from 'react'
import { Download, Send } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db.js'
import { deleteRecord, updateRecord } from '../api/localApi.js'
import { exportCsv } from '../lib/csv.js'
import { dateBR } from '../lib/format.js'
import { buildProducaoPayload, periodSlug, downloadJSON } from '../lib/backup.js'
import Filters from '../components/Filters.jsx'
import RecordList from '../components/RecordList.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import PeriodPicker from '../components/PeriodPicker.jsx'
import Toast from '../components/Toast.jsx'
import { useToast } from '../hooks/useToast.js'
import { useRecordModal } from '../context/RecordModalContext.jsx'
import { useMonth } from '../context/MonthContext.jsx'

export default function RecordsPage() {
  const { open } = useRecordModal()
  const { year, month } = useMonth()
  const [filters, setFilters] = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null) // registro pendente de exclusao
  const [showSendPicker, setShowSendPicker] = useState(false)
  const [sendRecords, setSendRecords] = useState(null)
  const { toast, showToast } = useToast()

  const all = useLiveQuery(
    () => db.records.where({ year: Number(year), month: Number(month) }).reverse().sortBy('date'),
    [year, month], []
  )
  const accounts = useMemo(() => [...new Set(all.map((r) => r.account).filter(Boolean))], [all])

  const records = useMemo(() => {
    return all.filter((r) => {
      if (filters.date && r.date !== filters.date) return false
      if (filters.product && r.product !== filters.product) return false
      if (filters.account && r.account !== filters.account) return false
      return true
    })
  }, [all, filters])

  const handleDelete = (r) => setDeleteTarget(r)

  const handleDeleteConfirm = async () => {
    await deleteRecord(deleteTarget.id)
    setDeleteTarget(null)
  }

  const handleIgnore = async (r, ignored) => {
    await updateRecord(r.id, { ignored })
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
            Enviar produção
          </button>
          <button
            className="btn flex items-center gap-1.5"
            onClick={() => exportCsv(records, 'producao-filtrada.csv')}
          >
            <Download size={16} />
            Baixar ({records.length})
          </button>
        </div>
      </div>

      <Toast toast={toast} />

      <Filters value={filters} onChange={setFilters} accounts={accounts} />
      <RecordList records={records} onEdit={(r) => open(r)} onDelete={handleDelete} onIgnore={handleIgnore} />

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
    </section>
  )
}
