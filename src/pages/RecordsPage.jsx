import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db.js'
import { deleteRecord } from '../api/localApi.js'
import { exportCsv } from '../lib/csv.js'
import Filters from '../components/Filters.jsx'
import RecordList from '../components/RecordList.jsx'
import { useRecordModal } from '../context/RecordModalContext.jsx'

export default function RecordsPage() {
  const { open } = useRecordModal()
  const [filters, setFilters] = useState({})

  const all = useLiveQuery(() => db.records.orderBy('date').reverse().toArray(), [], [])
  const accounts = useMemo(() => [...new Set(all.map((r) => r.account).filter(Boolean))], [all])

  const records = useMemo(() => {
    return all.filter((r) => {
      if (filters.year && r.year !== Number(filters.year)) return false
      if (filters.month && r.month !== Number(filters.month)) return false
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
        <h2 className="text-xl font-bold">Registros</h2>
        <button className="btn" onClick={() => exportCsv(records, 'producao-filtrada.csv')}>
          ⬇️ CSV ({records.length})
        </button>
      </div>

      <Filters value={filters} onChange={setFilters} accounts={accounts} />
      <RecordList records={records} onEdit={(r) => open(r)} onDelete={handleDelete} />
    </section>
  )
}
