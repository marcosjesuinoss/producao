export const PRODUCTS = [
  'Abertura de Conta',
  'Capitalizacao - Mensal',
  'Capitalizacao - Unica',
  'Cartao de Credito',
  'Cobranca - CA',
  'Cobranca - LP',
  'Cobranca - Mora',
  'Consorcio',
  'Credito Pessoal',
  'Dental',
  'Financiamento',
  'Investimentos',
  'Previdencia - Mensal',
  'Previdencia - Unica',
  'Seguro Auto/RE',
  'Seguro de Vida - Mensal',
  'Seguro de Vida - Unico',
  'Seguro Prestamista',
  'Seguro Residencial'
]

export const MONTHS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
]

export const brl = (n) =>
  n == null ? '—' : Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const num = (n) => Number(n || 0).toLocaleString('pt-BR')

export const todayISO = () => new Date().toISOString().slice(0, 10)

// Valida numero no formato pt-BR: ponto APENAS como milhar (3 digitos apos),
// virgula como decimal. Ex valido: "100", "8,4", "7.000", "1.500,50"
// Ex INVALIDO: "8.4" (dot sem 3 digitos), "8.44"
export const BR_NUM_RE = /^(\d{1,3}(\.\d{3})*(,\d*)?|\d+(,\d*)?)$/

// Apenas estes dois produtos usam QUANTIDADE como métrica principal.
// Todos os demais usam VALOR (R$).
export const QTY_PRODUCTS = new Set(['Abertura de Conta', 'Cartao de Credito'])

export const VALUE_PRODUCTS = new Set(PRODUCTS.filter((p) => !QTY_PRODUCTS.has(p)))
