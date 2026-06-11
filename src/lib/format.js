export const PRODUCTS = [
  'Conta Corrente',
  'Seguro de Vida',
  'Consorcio',
  'Cartao de Credito',
  'Previdencia',
  'Capitalizacao',
  'Credito Pessoal',
  'Investimentos'
]

export const MONTHS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
]

export const brl = (n) =>
  n == null ? '—' : Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const num = (n) => Number(n || 0).toLocaleString('pt-BR')

export const todayISO = () => new Date().toISOString().slice(0, 10)
