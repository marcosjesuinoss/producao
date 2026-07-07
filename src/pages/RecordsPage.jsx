import { useMemo, useState } from 'react'
import { Download, Send } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db.js'
import { deleteRecord, updateRecord } from '../api/localApi.js'
import { exportCsv } from '../lib/csv.js'
import { dateBR } from '../lib/format.js'
import { exportProducao, downloadJSON } from '../lib/backup.js'
import Filters from '../components/Filters.jsx'
import RecordList from '../components/RecordList.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import PeriodPicker from '../components/PeriodPicker.jsx'
import { useRecordModal } from '../context/RecordModalContext.jsx'
import { useMonth } from '../context/MonthContext.jsx'

export default function RecordsPage() {
  const { open } = useRecordModal()
  const { year, month } = useMonth()
  const [filters, setFilters] = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null) // registro pendente de exclusao
  const [showSendPicker, setShowSendPicker] = useState(false)
  const [msg, setMsg] = useState('')

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

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

  const handleSendProducao = async (period) => {
    setShowSendPicker(false)
    try {
      const { payload, filename } = await exportProducao(period)
      const file = new File([JSON.stringify(payload, null, 2)], filename, { type: 'application/json' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Produção enviada' })
      } else {
        downloadJSON(payload, filename)
        flash('Arquivo baixado — anexe no WhatsApp manualmente.')
      }
    } catch (e) {
      if (e.name !== 'AbortError') flash('Erro ao gerar arquivo de produção.')
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Registros</h2>
        <div className="flex items-center gap-2">
          <button
            className="btn flex items-center gap-1.5"
            onClick={() => setShowSendPicker(true)}
          >
            <Send size={16} />
            Enviar produção
          </button>
          <button
            className="btn flex items-center gap-1.5"
            onClick={() => exportCsv(records, 'producao-filtrada.csv')}
          >
            <Download size={16} />
            CSV ({records.length})
          </button>
        </div>
      </div>

      {msg && (
        <p className="text-sm" style={{ color: 'var(--accent-green)' }} role="status">{msg}</p>
      )}

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
