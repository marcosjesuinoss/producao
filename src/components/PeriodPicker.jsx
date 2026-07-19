import { useState } from 'react'
import { X } from 'lucide-react'
import { todayISO } from '../lib/format.js'

const optionCardStyle = (active) => ({
  padding: '12px',
  borderRadius: '10px',
  border: `1.5px solid ${active ? '#818cf8' : '#2d3748'}`,
  background: active ? 'rgba(99,102,241,0.12)' : 'var(--bg-card-deep)',
  cursor: 'pointer',
  transition: 'all 0.15s',
  textAlign: 'center',
})

const toggleBtnStyle = (active) => ({
  flex: 1,
  border: active ? '1px solid #818cf8' : '1px solid var(--input-border)',
  background: active ? 'rgba(99,102,241,0.1)' : 'var(--bg-card-deep)',
  color: active ? '#818cf8' : 'var(--text-secondary)',
})

const now = new Date()
const CURRENT_YEAR = now.getFullYear()
const CURRENT_MONTH = now.getMonth() + 1

// Devolve o objeto { type, year, month/semester/date } via onConfirm.
// dayOption: quando true, adiciona a opcao "Dia" (usado em "Enviar producao").
export default function PeriodPicker({ title = 'Escolha o período', dayOption = false, onConfirm, onCancel }) {
  const [type, setType] = useState(dayOption ? 'dia' : 'mes')
  const [year, setYear] = useState(CURRENT_YEAR)
  const [month, setMonth] = useState(CURRENT_MONTH)
  const [semester, setSemester] = useState(CURRENT_MONTH <= 6 ? 1 : 2)
  const [day, setDay] = useState(todayISO())

  const handleConfirm = () => {
    if (type === 'dia') return onConfirm({ type: 'dia', date: day })
    if (type === 'tudo') return onConfirm({ type: 'tudo' })
    if (type === 'ano') return onConfirm({ type: 'ano', year })
    if (type === 'semestre') return onConfirm({ type: 'semestre', year, semester })
    return onConfirm({ type: 'mes', year, month })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onCancel}
        aria-hidden
      />

      <div
        className="relative w-full sm:max-w-md flex flex-col"
        style={{ background: 'var(--c-surface)', borderRadius: '24px', maxHeight: '85dvh', boxShadow: '0 24px 48px rgba(0,0,0,0.4)' }}
      >

        <div className="px-5 pt-2 pb-3 shrink-0 flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          <button
            onClick={onCancel}
            className="shrink-0 mt-0.5 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'var(--bg-card-deep)', color: 'var(--text-muted)' }}
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-2 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {[
              ...(dayOption ? [['dia', 'Dia']] : []),
              ['mes', 'Mês'],
              ['semestre', 'Semestre'],
              ['ano', 'Ano'],
              ['tudo', 'Tudo'],
            ].map(([value, label]) => (
              <div key={value} style={optionCardStyle(type === value)} onClick={() => setType(value)}>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</span>
              </div>
            ))}
          </div>

          {type === 'dia' && (
            <div>
              <label className="label" htmlFor="pp-day">Dia</label>
              <input
                id="pp-day"
                type="date"
                className="input !w-fit"
                value={day}
                onChange={(e) => setDay(e.target.value)}
              />
            </div>
          )}

          {type === 'mes' && (
            <div>
              <label className="label" htmlFor="pp-month">Mês</label>
              <input
                id="pp-month"
                type="month"
                className="input !w-fit"
                value={`${year}-${String(month).padStart(2, '0')}`}
                onChange={(e) => {
                  const [y, m] = e.target.value.split('-').map(Number)
                  if (y) setYear(y)
                  if (m) setMonth(m)
                }}
              />
            </div>
          )}

          {type === 'semestre' && (
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="label">Semestre</label>
                <div className="flex gap-2">
                  <button type="button" className="btn" style={toggleBtnStyle(semester === 1)} onClick={() => setSemester(1)}>
                    1º
                  </button>
                  <button type="button" className="btn" style={toggleBtnStyle(semester === 2)} onClick={() => setSemester(2)}>
                    2º
                  </button>
                </div>
              </div>
              <div style={{ width: '100px' }}>
                <label className="label" htmlFor="pp-year-sem">Ano</label>
                <input
                  id="pp-year-sem" type="number" className="input"
                  value={year} onChange={(e) => setYear(Number(e.target.value) || CURRENT_YEAR)}
                />
              </div>
            </div>
          )}

          {type === 'ano' && (
            <div>
              <label className="label" htmlFor="pp-year">Ano</label>
              <input
                id="pp-year" type="number" className="input !w-fit"
                value={year} onChange={(e) => setYear(Number(e.target.value) || CURRENT_YEAR)}
              />
            </div>
          )}
        </div>

        <div className="px-5 pb-6 pt-3 shrink-0 flex gap-2">
          <button className="btn flex-1" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-brand flex-1" onClick={handleConfirm}>Continuar</button>
        </div>
      </div>
    </div>
  )
}
