import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Settings } from 'lucide-react'
import { BR_NUM_RE, todayISO } from '../lib/format.js'
import { useProducts } from '../hooks/useProducts.js'
import { getAgenciaEnabled, getAgenciaDefault, getDigitoEnabled, formatAccountMask, accountCursorForDigitCount } from '../lib/agencia.js'
import RegistroSettingsModal from './RegistroSettingsModal.jsx'

const ABERTURA = 'Abertura de Conta'

// "date" NAO entra aqui — todayISO() so seria avaliado uma vez, quando este
// arquivo carrega. Num PWA que fica aberto passando da meia-noite, isso
// travaria a data padrao no dia em que a aba foi aberta. Por isso "date" e
// preenchido na hora certa (todayISO() de novo) em cada lugar que reseta o
// formulario pra um registro novo.
const empty = {
  date: '',
  product: '',
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

const validate = (f, isValueFn, agenciaEnabled, digitoEnabled) => {
  const e = {}
  const isValueProd = isValueFn(f.product)
  if (!f.date) e.date = 'Informe a data'
  if (!f.product) e.product = 'Informe o produto'
  {
    // Conta valida = pelo menos 1 digito de corpo (+ 1 verificador, se
    // digitoEnabled — ex: "1-2"). Com agencia ativada, isso vem depois dos
    // 4 digitos dela (ex: "1234 / 1-2") — senao "salva" so a agencia
    // pre-preenchida sem o usuario ter digitado a conta de verdade.
    const digits = String(f.account ?? '').replace(/\D/g, '')
    const minDigits = (agenciaEnabled ? 4 : 0) + (digitoEnabled ? 2 : 1)
    if (digits.length < minDigits) {
      const exemplo = digitoEnabled
        ? (agenciaEnabled ? '1234 / 1-2' : '1-2')
        : (agenciaEnabled ? '1234 / 1' : '1')
      e.account = digitoEnabled
        ? `Conta incompleta — informe pelo menos 1 dígito + verificador (ex: ${exemplo})`
        : `Informe a conta (ex: ${exemplo})`
    }
  }
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
  const agenciaEnabled = getAgenciaEnabled()
  const digitoEnabled = getDigitoEnabled()
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState({})
  const [showRegistroSettings, setShowRegistroSettings] = useState(false)
  const accountRef = useRef(null)
  const accountCursor = useRef(null) // posicao pendente de restaurar apos o render

  useEffect(() => {
    if (initial) {
      setForm({ ...empty, ...initial, value: numToDisplay(initial.value), quantity: numToDisplay(initial.quantity) })
    } else {
      // Registro novo: pre-preenche com a agencia padrao (Ajustes > Registro),
      // se estiver ativada — o usuario pode apagar com backspace normalmente.
      // Produto padrao vem da lista REAL de produtos (allProducts[0]), nao de
      // um nome fixo no codigo — se o primeiro produto for renomeado/excluido,
      // o campo continua abrindo com uma opcao valida em vez de vazio.
      const agencia = agenciaEnabled ? getAgenciaDefault() : ''
      setForm({
        ...empty,
        date: todayISO(),
        product: allProducts[0] ?? '',
        account: agencia ? formatAccountMask(agencia, true, digitoEnabled) : '',
      })
    }
    setErrors({})
  }, [initial])

  // Reparo pro caso do efeito acima ter rodado ANTES de allProducts carregar
  // (consulta assincrona ao banco — pode nao ter resolvido ainda no exato
  // instante em que o formulario abre): nesse caso form.product fica vazio,
  // mas o <select> do navegador, sem nenhuma opcao com value="", mostra o
  // primeiro produto da lista como se estivesse selecionado — ilusao que
  // faz o app tratar o produto errado (cai no padrao "valor" e esconde os
  // campos exclusivos de "Abertura de Conta"). So preenche se ainda estiver
  // vazio, pra nunca sobrescrever uma escolha real do usuario.
  useEffect(() => {
    if (!initial && !form.product && allProducts.length > 0) {
      setForm((f) => ({ ...f, product: allProducts[0] }))
    }
  }, [initial, allProducts, form.product])

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => { const n = { ...e }; delete n[k]; return n })
  }

  const onAccountChange = (e) => {
    const { value, selectionStart } = e.target
    const digitsBeforeCursor = (value.slice(0, selectionStart).match(/\d/g) || []).length
    const masked = formatAccountMask(value, agenciaEnabled, digitoEnabled)
    // Onde o cursor deve parar: conta quantos digitos vieram antes dele no
    // texto digitado e acha a posicao equivalente no texto ja mascarado
    // (pulando os separadores "/" e "-" auto-inseridos).
    accountCursor.current = accountCursorForDigitCount(masked, digitsBeforeCursor)
    set('account', masked)
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

  // Intercepta "." digitado e troca por "," (ponto = milhar, não decimal).
  // Via evento nativo 'input' (nativeEvent.data), não onKeyDown: varios
  // teclados Android (Gboard, teclado Samsung) nao disparam keydown com a
  // tecla certa pro teclado numerico virtual — so o input mesmo dispara de
  // forma confiavel em qualquer teclado. Sem isso, o "." sumia sem virar
  // virgula pra quem usava esses teclados.
  const onMaskedChange = (field) => (e) => {
    const { value, selectionStart } = e.target
    if (e.nativeEvent?.data === '.') {
      const i = selectionStart - 1
      set(field, applyMask(value.slice(0, i) + ',' + value.slice(i + 1)))
    } else {
      set(field, applyMask(value))
    }
  }

  // Ao sair do campo de valor R$, completa ",00" se não houver centavos
  const fillCents = (field) => (e) => {
    const v = e.target.value.trim()
    if (v && !v.includes(',')) set(field, v + ',00')
  }

  const submit = (e) => {
    e.preventDefault()
    const errs = validate(form, isValue, agenciaEnabled, digitoEnabled)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    onSubmit(form)
    if (!initial) setForm({ ...empty, date: todayISO(), product: allProducts[0] ?? '' })
  }

  const isAbertura = form.product === ABERTURA
  const isValueProd = isValue(form.product)

  const inputCls = (field) =>
    `input${errors[field] ? ' !border-[color:var(--c-bad)]' : ''}`

  return (
    <>
    <form className={`${noCard ? '' : 'card '}grid grid-cols-1 sm:grid-cols-2 gap-3`} onSubmit={submit}
      aria-label={initial ? 'Editar registro' : 'Novo registro'} noValidate>

      <div>
        <label className="label" htmlFor="r-date">Data *</label>
        <div className="flex justify-between gap-2">
          <input id="r-date" type="date" className={`${inputCls('date')} !w-fit max-w-full`}
            value={form.date} onChange={(e) => set('date', e.target.value)} />
          <button
            type="button"
            onClick={() => setShowRegistroSettings(true)}
            aria-label="Ajuste de registro"
            className="shrink-0 px-2.5 rounded-lg"
            style={{ background: 'var(--btn-bg)', boxShadow: 'var(--shadow-btn)', color: 'var(--text-muted)' }}
          >
            <Settings size={16} />
          </button>
        </div>
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
        <label className="label" htmlFor="r-account">
          {agenciaEnabled ? 'Agência / Conta do produto' : 'Conta produção'} *
        </label>
        <input id="r-account" ref={accountRef} className={inputCls('account')}
          placeholder={
            agenciaEnabled
              ? (digitoEnabled ? '1234 / 1234567-8' : '1234 / 12345678')
              : (digitoEnabled ? '1234567-8' : '12345678')
          }
          inputMode="numeric"
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
            onChange={onMaskedChange('value')}
            onBlur={fillCents('value')} />
          {errors.value && <p className="text-xs mt-1" style={{ color: 'var(--c-bad)' }}>{errors.value}</p>}
        </div>
      ) : (
        <div>
          <label className="label" htmlFor="r-qty">Quantidade *</label>
          <input id="r-qty" type="text" inputMode="decimal" className={inputCls('quantity')}
            placeholder="ex: 1 ou 1,5"
            value={form.quantity}
            onChange={onMaskedChange('quantity')} />
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

    {showRegistroSettings && (
      <RegistroSettingsModal onClose={() => setShowRegistroSettings(false)} />
    )}
    </>
  )
}
