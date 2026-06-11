import { useEffect, useState } from 'react'
import { PRODUCTS, todayISO } from '../lib/format.js'

const empty = { date: todayISO(), product: PRODUCTS[0], account: '', manager: '', quantity: 1, value: '', notes: '' }

/*
  AddRecordForm — cria ou edita um registro.
  Se `initial` vier preenchido, entra em modo edicao.
*/
export default function RecordForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState(empty)
  useEffect(() => { setForm(initial ? { ...empty, ...initial } : empty) }, [initial])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const submit = (e) => {
    e.preventDefault()
    if (!form.date || !form.product) return
    onSubmit(form)
    if (!initial) setForm(empty)
  }

  return (
    <form className="card grid md:grid-cols-3 gap-3" onSubmit={submit} aria-label={initial ? 'Editar registro' : 'Novo registro'}>
      <div>
        <label className="label" htmlFor="r-date">Data *</label>
        <input id="r-date" type="date" required className="input" value={form.date} onChange={(e) => set('date', e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="r-product">Produto *</label>
        <select id="r-product" className="input" value={form.product} onChange={(e) => set('product', e.target.value)}>
          {PRODUCTS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="r-account">Conta responsavel</label>
        <input id="r-account" className="input" placeholder="AG / GER" value={form.account} onChange={(e) => set('account', e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="r-manager">Gerente</label>
        <input id="r-manager" className="input" value={form.manager} onChange={(e) => set('manager', e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="r-qty">Quantidade *</label>
        <input id="r-qty" type="number" min="0" step="1" required className="input" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="r-value">Valor (R$) — opcional</label>
        <input id="r-value" type="number" min="0" step="0.01" className="input" value={form.value} onChange={(e) => set('value', e.target.value)} />
      </div>
      <div className="md:col-span-3">
        <label className="label" htmlFor="r-notes">Observacoes</label>
        <textarea id="r-notes" rows="2" className="input" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>
      <div className="md:col-span-3 flex gap-2">
        <button type="submit" className="btn btn-brand">{initial ? 'Salvar alteracoes' : 'Adicionar registro'}</button>
        {initial && <button type="button" className="btn" onClick={onCancel}>Cancelar</button>}
      </div>
    </form>
  )
}
