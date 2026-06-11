import { brl, num } from '../lib/format.js'

/*
  ListRecords — tabela com acoes editar/excluir.
  Responsiva: vira cards no mobile via CSS utilitario do Tailwind.
*/
export default function RecordList({ records, onEdit, onDelete }) {
  if (!records?.length) {
    return <div className="card text-center text-muted py-8">Nenhum registro para os filtros atuais.</div>
  }
  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full text-sm">
        <caption className="sr-only">Lista de registros de producao</caption>
        <thead>
          <tr className="text-left" style={{ color: 'var(--c-muted)' }}>
            <th className="p-3">Data</th>
            <th className="p-3">Produto</th>
            <th className="p-3 hidden sm:table-cell">Conta</th>
            <th className="p-3 text-right">Qtd</th>
            <th className="p-3 text-right hidden sm:table-cell">Valor</th>
            <th className="p-3 text-right">Acoes</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} className="border-t" style={{ borderColor: 'var(--c-border)' }}>
              <td className="p-3 whitespace-nowrap">{r.date.split('-').reverse().join('/')}</td>
              <td className="p-3">
                {r.product}
                {r.notes && <span className="block text-xs text-muted">{r.notes}</span>}
              </td>
              <td className="p-3 hidden sm:table-cell text-muted">{r.account || '—'}</td>
              <td className="p-3 text-right font-medium">{num(r.quantity)}</td>
              <td className="p-3 text-right hidden sm:table-cell">{brl(r.value)}</td>
              <td className="p-3 text-right whitespace-nowrap">
                <button className="btn px-2 py-1" onClick={() => onEdit(r)} aria-label={`Editar registro de ${r.date}`}>✏️</button>
                <button className="btn px-2 py-1 ml-1" onClick={() => onDelete(r)} aria-label={`Excluir registro de ${r.date}`}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
