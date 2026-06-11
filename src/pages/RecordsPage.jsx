import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db.js'
import { createRecord, updateRecord, deleteRecord } from '../api/localApi.js'
import { exportCsv } from '../lib/csv.js'
import Filters from '../components/Filters.jsx'
import RecordForm from '../components/RecordForm.jsx'
import RecordList from '../components/RecordList.jsx'

// Tela de listagem + CRUD + filtros + export CSV.
export default function RecordsPage() {
  const [filters, setFilters] = useState({})
  const [editing, setEditing] = useState(null)

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

  const handleSubmit = async (form) => {
    if (editing) {
      await updateRecord(editing.id, form)
      setEditing(null)
    } else {
      await createRecord(form)
    }
  }
  const handleDelete = async (r) => {
    if (confirm(`Excluir registro de ${r.product} em ${r.date}?`)) await deleteRecord(r.id)
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xl font-bold">Registros</h2>
        <button className="btn" onClick={() => exportCsv(records, 'producao-filtrada.csv')}>
          ⬇️ Exportar CSV ({records.length})
        </button>
      </div>

      <RecordForm initial={editing} onSubmit={handleSubmit} onCancel={() => setEditing(null)} />
      <Filters value={filters} onChange={setFilters} accounts={accounts} />
      <RecordList records={records} onEdit={setEditing} onDelete={handleDelete} />
    </section>
  )
}
