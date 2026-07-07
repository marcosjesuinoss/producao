import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db.js'
import { deleteRecord, updateRecord } from '../api/localApi.js'
import { exportCsv } from '../lib/csv.js'
import { dateBR } from '../lib/format.js'
import Filters from '../components/Filters.jsx'
import RecordList from '../components/RecordList.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { useRecordModal } from '../context/RecordModalContext.jsx'
import { useMonth } from '../context/MonthContext.jsx'

export default function RecordsPage() {
  const { open } = useRecordModal()
  const { year, month } = useMonth()
  const [filters, setFilters] = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null) // registro pendente de exclusao

  const all = useLiveQuery(
    () => db.records.where({ year: Number(year), month: Number(month) }).reverse().sortBy('date'),
    [year, month], []
  )
  const accounts = useMemo(() => [...new Set(all.map((r) => r.account).filter(Boolean))], [all])
  const managers = useMemo(() => [...new Set(all.map((r) => r.manager).filter(Boolean))], [all])

  const records = useMemo(() => {
    return all.filter((r) => {
      if (filters.date && r.date !== filters.date) return false
      if (filters.product && r.product !== filters.product) return false
      if (filters.account && r.account !== filters.account) return false
      if (filters.manager && r.manager !== filters.manager) return false
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

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Registros</h2>
        <button
          className="btn flex items-center gap-1.5"
          onClick={() => exportCsv(records, 'producao-filtrada.csv')}
        >
          <Download size={16} />
          CSV ({records.length})
        </button>
      </div>

      <Filters value={filters} onChange={setFilters} accounts={accounts} managers={managers} />
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
    </section>
  )
}
