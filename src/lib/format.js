export const PRODUCTS = [
  'Abertura de Conta',
  'Capitalizacao - Mensal',
  'Capitalizacao - Unica',
  'Cartao de Credito',
  'CDC',
  'Cobranca - CA',
  'Cobranca - LP',
  'Cobranca - Mora',
  'Consorcio',
  'Credito Consignado',
  'Credito Imobiliario',
  'Credito Pessoal',
  'Credito Rural',
  'Dental',
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

export const FULL_MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export const brl = (n) =>
  n == null ? '—' : Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const num = (n) => Number(n || 0).toLocaleString('pt-BR')

// Trunca percentual sem arredondar: 89,99% continua 89%, so vira 90% ao atingir 90% de fato.
// toFixed(6) elimina ruido de ponto flutuante (ex.: 89.999999999999996) sem afetar o valor real.
export const floorPct = (n) => Math.floor(Number(n.toFixed(6)))

export const todayISO = () => new Date().toISOString().slice(0, 10)

// "2026-06-30" -> "30/06/2026". Manipulacao de string (sem Date) pra evitar
// o bug classico de fuso horario ao interpretar "YYYY-MM-DD" como UTC.
export const dateBR = (iso) => {
  const [y, m, d] = String(iso).split('-')
  return `${d}/${m}/${y}`
}

// Valida numero no formato pt-BR: ponto APENAS como milhar (3 digitos apos),
// virgula como decimal. Ex valido: "100", "8,4", "7.000", "1.500,50"
// Ex INVALIDO: "8.4" (dot sem 3 digitos), "8.44"
export const BR_NUM_RE = /^(\d{1,3}(\.\d{3})*(,\d*)?|\d+(,\d*)?)$/

export const QTY_PRODUCTS = new Set(['Abertura de Conta', 'Cartao de Credito'])

// Lista canônica de produtos padrão com seus tipos — usada para seed inicial no DB
export const STANDARD_PRODUCTS = PRODUCTS.map((name) => ({
  name,
  useValue: !QTY_PRODUCTS.has(name),
}))

export const VALUE_PRODUCTS = new Set(PRODUCTS.filter((p) => !QTY_PRODUCTS.has(p)))

