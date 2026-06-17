import { useEffect, useState } from 'react'
import { PRODUCTS, VALUE_PRODUCTS, BR_NUM_RE, todayISO } from '../lib/format.js'

const ABERTURA = 'Abertura de Conta'

const empty = {
  date: todayISO(),
  product: PRODUCTS[0],
  account: '',
  quantity: '',
  value: '',
  notes: '',
  qualified: false
}

// Retorna o numero, null se vazio, ou undefined se formato invalido
const parseBR = (v) => {
  const s = String(v ?? '').trim()
  if (!s) return null
  if (!BR_NUM_RE.test(s)) return undefined
  const n = Number(s.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

const validate = (f) => {
  const e = {}
  const isValueProd = VALUE_PRODUCTS.has(f.product)
  if (!f.date) e.date = 'Informe a data'
  if (!f.product) e.product = 'Informe o produto'
  if (!f.account?.trim()) e.account = 'Informe a conta de produção'
  if (isValueProd) {
    const n = parseBR(f.value)
    if (n === undefined) e.value = 'Formato inválido — use vírgula para decimal: 8,4 ou 8.400,00'
    else if (n == null || n <= 0) e.value = 'Informe o valor da operação'
  } else {
    const n = parseBR(f.quantity)
    if (n === undefined) e.quantity = 'Formato inválido — use vírgula para decimal: 1,5'
    else if (n == null || n <= 0) e.quantity = 'Informe uma quantidade válida (ex: 1 ou 1,5)'
  }
  return e
}

export default function RecordForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setForm(initial ? { ...empty, ...initial } : empty)
    setErrors({})
  }, [initial])

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => { const n = { ...e }; delete n[k]; return n })
  }

  const submit = (e) => {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    onSubmit(form)
    if (!initial) setForm(empty)
  }

  const isAbertura = form.product === ABERTURA
  const isValueProd = VALUE_PRODUCTS.has(form.product)

  const inputCls = (field) =>
    `input${errors[field] ? ' !border-[color:var(--c-bad)]' : ''}`

  return (
    <form className="card grid grid-cols-1 sm:grid-cols-2 gap-3" onSubmit={submit}
      aria-label={initial ? 'Editar registro' : 'Novo registro'} noValidate>

      <div>
        <label className="label" htmlFor="r-date">Data *</label>
        <input id="r-date" type="date" className={`${inputCls('date')} !w-fit max-w-full`}
          value={form.date} onChange={(e) => set('date', e.target.value)} />
        {errors.date && <p className="text-xs mt-1" style={{ color: 'var(--c-bad)' }}>{errors.date}</p>}
      </div>

      <div>
        <label className="label" htmlFor="r-product">Produto *</label>
        <select id="r-product" className={inputCls('product')}
          value={form.product} onChange={(e) => set('product', e.target.value)}>
          {PRODUCTS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {errors.product && <p className="text-xs mt-1" style={{ color: 'var(--c-bad)' }}>{errors.product}</p>}
      </div>

      <div>
        <label className="label" htmlFor="r-account">Conta produção *</label>
        <input id="r-account" className={inputCls('account')} placeholder="AG / CONTA"
          value={form.account} onChange={(e) => set('account', e.target.value)} />
        {errors.account && <p className="text-xs mt-1" style={{ color: 'var(--c-bad)' }}>{errors.account}</p>}
      </div>

      {/* Crédito Pessoal: valor obrigatório vem antes, quantidade some */}
      {isValueProd ? (
        <div>
          <label className="label" htmlFor="r-value">Valor (R$) *</label>
          <input id="r-value" type="text" inputMode="decimal" className={inputCls('value')}
            placeholder="100.000,00"
            value={form.value}
            onChange={(e) => set('value', e.target.value.replace(/[^0-9.,]/g, ''))} />
          {errors.value && <p className="text-xs mt-1" style={{ color: 'var(--c-bad)' }}>{errors.value}</p>}
        </div>
      ) : (
        <>
          <div>
            <label className="label" htmlFor="r-qty">Quantidade *</label>
            <input id="r-qty" type="text" inputMode="decimal" className={inputCls('quantity')}
              placeholder="ex: 1 ou 1,5"
              value={form.quantity}
              onChange={(e) => set('quantity', e.target.value.replace(/[^0-9.,]/g, ''))} />
            {errors.quantity && <p className="text-xs mt-1" style={{ color: 'var(--c-bad)' }}>{errors.quantity}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="r-value">Valor (R$) — opcional</label>
            <input id="r-value" type="text" inputMode="decimal" className="input"
              placeholder="100.000,00"
              value={form.value}
              onChange={(e) => set('value', e.target.value.replace(/[^0-9.,]/g, ''))} />
          </div>
        </>
      )}

      {/* Conta qualificada — só para Abertura de Conta */}
      {isAbertura && (
        <div className="sm:col-span-2 flex items-center gap-2">
          <input id="r-qualified" type="checkbox" className="w-4 h-4 accent-[color:var(--c-brand)]"
            checked={form.qualified} onChange={(e) => set('qualified', e.target.checked)} />
          <label htmlFor="r-qualified" className="text-sm font-medium cursor-pointer select-none">
            Conta qualificada
          </label>
        </div>
      )}

      <div className="sm:col-span-2">
        <label className="label" htmlFor="r-notes">Observações</label>
        <textarea id="r-notes" rows="2" className="input"
          value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>

      <div className="sm:col-span-2 flex gap-2">
        <button type="submit" className="btn btn-brand">
          {initial ? 'Salvar alterações' : 'Adicionar registro'}
        </button>
        {initial && <button type="button" className="btn" onClick={onCancel}>Cancelar</button>}
      </div>
    </form>
  )
}
