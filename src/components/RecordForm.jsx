import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { PRODUCTS, BR_NUM_RE, todayISO } from '../lib/format.js'
import { useProducts } from '../hooks/useProducts.js'

const ABERTURA = 'Abertura de Conta'

// Conta producao: aceita so digitos e "/". O "." e um atalho pro "/" (o
// teclado numerico do celular tem "." mas nao "/") — a troca acontece ANTES
// do filtro, senao o ponto seria descartado como caractere invalido.
const cleanAccount = (v) => String(v ?? '').replace(/\./g, '/').replace(/[^0-9/]/g, '')

const empty = {
  date: todayISO(),
  product: PRODUCTS[0],
  account: '',
  quantity: '',
  value: '',
  notes: '',
  qualified: false,
  clientName: '',
}

// Auto-mascara pt-BR: remove pontos antigos (milhar), re-adiciona a cada 3 dígitos
const applyMask = (v) => {
  let raw = String(v ?? '').replace(/\./g, '').replace(/[^0-9,]/g, '')
  const ci = raw.indexOf(',')
  if (ci !== -1) raw = raw.slice(0, ci + 1) + raw.slice(ci + 1).replace(/,/g, '')
  const [int = '', dec] = raw.split(',')
  const fInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return dec !== undefined ? `${fInt},${dec}` : fInt
}

// Número salvo no banco → string formatada para exibição ao editar
const numToDisplay = (n) =>
  n == null || n === '' ? '' : Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 })

// Retorna o numero, null se vazio, ou undefined se formato invalido
const parseBR = (v) => {
  const s = String(v ?? '').trim()
  if (!s) return null
  if (!BR_NUM_RE.test(s)) return undefined
  const n = Number(s.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

const validate = (f, isValueFn) => {
  const e = {}
  const isValueProd = isValueFn(f.product)
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

export default function RecordForm({ initial, onSubmit, onCancel, noCard = false }) {
  const { allProducts, isValue } = useProducts()
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState({})
  const accountRef = useRef(null)
  const accountCursor = useRef(null) // posicao pendente de restaurar apos o render

  useEffect(() => {
    setForm(initial
      ? { ...empty, ...initial, value: numToDisplay(initial.value), quantity: numToDisplay(initial.quantity) }
      : empty)
    setErrors({})
  }, [initial])

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => { const n = { ...e }; delete n[k]; return n })
  }

  const onAccountChange = (e) => {
    const raw = e.target.value
    // Onde o cursor deve parar: limpa so o trecho ANTES dele e usa o tamanho
    // resultante. Assim "." -> "/" mantem a posicao, e um caractere rejeitado
    // no meio do texto nao empurra o cursor pro fim.
    accountCursor.current = cleanAccount(raw.slice(0, e.target.selectionStart)).length
    set('account', cleanAccount(raw))
  }

  // Restaura o cursor depois que o React reescreve o value do input (o que,
  // por padrao, jogaria o cursor pro fim). Sem array de dependencias de
  // proposito: precisa rodar tambem quando o texto limpo nao muda (ex.:
  // caractere invalido digitado no meio), caso em que o React so desfaz a
  // edicao no DOM sem alterar o state.
  useLayoutEffect(() => {
    if (accountCursor.current == null || !accountRef.current) return
    const pos = accountCursor.current
    accountCursor.current = null
    accountRef.current.setSelectionRange(pos, pos)
  })

  // Intercepta tecla "." e insere "," no lugar (ponto = milhar, não decimal)
  const onDotKey = (field) => (e) => {
    if (e.key !== '.') return
    e.preventDefault()
    const { selectionStart: s, selectionEnd: en, value } = e.target
    set(field, applyMask(value.slice(0, s) + ',' + value.slice(en)))
  }

  // Ao sair do campo de valor R$, completa ",00" se não houver centavos
  const fillCents = (field) => (e) => {
    const v = e.target.value.trim()
    if (v && !v.includes(',')) set(field, v + ',00')
  }

  const submit = (e) => {
    e.preventDefault()
    const errs = validate(form, isValue)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    onSubmit(form)
    if (!initial) setForm(empty)
  }

  const isAbertura = form.product === ABERTURA
  const isValueProd = isValue(form.product)

  const inputCls = (field) =>
    `input${errors[field] ? ' !border-[color:var(--c-bad)]' : ''}`

  return (
    <form className={`${noCard ? '' : 'card '}grid grid-cols-1 sm:grid-cols-2 gap-3`} onSubmit={submit}
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
          {allProducts.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {errors.product && <p className="text-xs mt-1" style={{ color: 'var(--c-bad)' }}>{errors.product}</p>}
      </div>

      <div>
        <label className="label" htmlFor="r-account">Conta produção *</label>
        <input id="r-account" ref={accountRef} className={inputCls('account')} placeholder="AG / CONTA" inputMode="numeric"
          value={form.account} onChange={onAccountChange} />
        {errors.account && <p className="text-xs mt-1" style={{ color: 'var(--c-bad)' }}>{errors.account}</p>}
      </div>

      {/* Crédito Pessoal: valor obrigatório vem antes, quantidade some */}
      {isValueProd ? (
        <div>
          <label className="label" htmlFor="r-value">Valor (R$) *</label>
          <input id="r-value" type="text" inputMode="decimal" className={inputCls('value')}
            placeholder="100.000,00"
            value={form.value}
            onChange={(e) => set('value', applyMask(e.target.value))}
            onKeyDown={onDotKey('value')}
            onBlur={fillCents('value')} />
          {errors.value && <p className="text-xs mt-1" style={{ color: 'var(--c-bad)' }}>{errors.value}</p>}
        </div>
      ) : (
        <div>
          <label className="label" htmlFor="r-qty">Quantidade *</label>
          <input id="r-qty" type="text" inputMode="decimal" className={inputCls('quantity')}
            placeholder="ex: 1 ou 1,5"
            value={form.quantity}
            onChange={(e) => set('quantity', applyMask(e.target.value))}
            onKeyDown={onDotKey('quantity')} />
          {errors.quantity && <p className="text-xs mt-1" style={{ color: 'var(--c-bad)' }}>{errors.quantity}</p>}
        </div>
      )}

      {/* Campos exclusivos de Abertura de Conta */}
      {isAbertura && (
        <>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="r-client">Nome do cliente — opcional</label>
            <input id="r-client" className="input" placeholder="Ex: João da Silva"
              value={form.clientName}
              onChange={(e) => set('clientName', e.target.value)} />
          </div>
          <div className="sm:col-span-2 flex items-center gap-2">
            <input id="r-qualified" type="checkbox" className="w-4 h-4 accent-[color:var(--c-brand)]"
              checked={form.qualified} onChange={(e) => set('qualified', e.target.checked)} />
            <label htmlFor="r-qualified" className="text-sm font-medium cursor-pointer select-none">
              Conta já qualificada
            </label>
          </div>
        </>
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
