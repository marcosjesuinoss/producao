import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db.js'
import { deleteRecord } from '../api/localApi.js'
import { exportCsv } from '../lib/csv.js'
import Filters from '../components/Filters.jsx'
import RecordList from '../components/RecordList.jsx'
import { useRecordModal } from '../context/RecordModalContext.jsx'
import { useMonth } from '../context/MonthContext.jsx'

export default function RecordsPage() {
  const { open } = useRecordModal()
  const { year, month } = useMonth()
  const [filters, setFilters] = useState({})

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

  const handleDelete = async (r) => {
    if (confirm(`Excluir registro de ${r.product} em ${r.date}?`)) await deleteRecord(r.id)
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

      <Filters value={filters} onChange={setFilters} accounts={accounts} />
      <RecordList records={records} onEdit={(r) => open(r)} onDelete={handleDelete} />
    </section>
  )
}
