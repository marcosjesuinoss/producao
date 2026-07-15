import { useState } from 'react'
import { ListFilter } from 'lucide-react'
import ProductRecordsModal from './ProductRecordsModal.jsx'

// Botao discreto ao lado do nome do produto (Resumo/Acumulado) que abre o
// detalhamento dos registros daquele produto no periodo. So pra produtos —
// nao usado em grupos.
export default function ViewRecordsButton({ product, year, startMonth, endMonth }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true) }}
        aria-label={`Ver registros de ${product}`}
        className="shrink-0 flex items-center justify-center"
        style={{ color: 'var(--text-faint)', padding: '2px', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <ListFilter size={12} />
      </button>
      {open && (
        <ProductRecordsModal
          product={product}
          year={year}
          startMonth={startMonth}
          endMonth={endMonth}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
