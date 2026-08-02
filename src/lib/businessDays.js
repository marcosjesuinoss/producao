// Calendario bancario (dias uteis) — segunda a sexta, menos feriados
// nacionais fixos e moveis. Sem tabela hardcoded pra nao precisar de
// manutencao ano a ano: os feriados moveis (Carnaval, Sexta-feira Santa,
// Corpus Christi) sao derivados da Pascoa via algoritmo de Meeus/Jones/
// Butcher.

// Domingo de Pascoa (calendario gregoriano). Retorna { month, day } (1-12).
export function computeEaster(year) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return { month, day }
}

// "2026-04-05" a partir de (year, month, dayOffset) em torno da Pascoa —
// construtor local de Date (nao "new Date(string)") pra nao cair no bug
// classico de fuso horario (mesmo cuidado ja tomado em dateBR, format.js).
const isoFromOffset = (year, easter, offsetDays) => {
  const d = new Date(year, easter.month - 1, easter.day)
  d.setDate(d.getDate() + offsetDays)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const pad2 = (n) => String(n).padStart(2, '0')

// Set<'YYYY-MM-DD'> com os feriados nacionais do ano — fixos + moveis
// (derivados da Pascoa do ano correspondente ao feriado movel, que pode
// cair no ano anterior/seguinte perto da virada — por isso os moveis
// aqui usam a Pascoa do proprio "year", correto pra feriados dentro dele).
const holidayCache = new Map()
export function getBrazilianHolidays(year) {
  if (holidayCache.has(year)) return holidayCache.get(year)

  const fixed = [
    `${year}-01-01`, // Confraternizacao Universal
    `${year}-04-21`, // Tiradentes
    `${year}-05-01`, // Dia do Trabalho
    `${year}-09-07`, // Independencia
    `${year}-10-12`, // Nossa Senhora Aparecida
    `${year}-11-02`, // Finados
    `${year}-11-15`, // Proclamacao da Republica
    `${year}-12-25`, // Natal
  ]

  const easter = computeEaster(year)
  const moving = [
    isoFromOffset(year, easter, -48), // Carnaval (segunda)
    isoFromOffset(year, easter, -47), // Carnaval (terca)
    isoFromOffset(year, easter, -2),  // Sexta-feira Santa
    isoFromOffset(year, easter, 60),  // Corpus Christi
  ]

  const set = new Set([...fixed, ...moving])
  holidayCache.set(year, set)
  return set
}

// Segunda a sexta e fora do Set de feriados do ano. dateStr: "YYYY-MM-DD".
export function isBusinessDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dow = new Date(y, m - 1, d).getDay() // 0=dom .. 6=sab, construtor local
  if (dow === 0 || dow === 6) return false
  return !getBrazilianHolidays(y).has(dateStr)
}

const daysInMonth = (year, month) => new Date(year, month, 0).getDate()

// Total de dias uteis no mes inteiro.
export function countBusinessDaysInMonth(year, month) {
  const total = daysInMonth(year, month)
  let count = 0
  for (let day = 1; day <= total; day++) {
    if (isBusinessDay(`${year}-${pad2(month)}-${pad2(day)}`)) count++
  }
  return count
}

// Dias uteis do dia 1 ate "throughDay" (inclusive).
export function countBusinessDaysElapsed(year, month, throughDay) {
  const lastDay = Math.min(Math.max(throughDay, 0), daysInMonth(year, month))
  let count = 0
  for (let day = 1; day <= lastDay; day++) {
    if (isBusinessDay(`${year}-${pad2(month)}-${pad2(day)}`)) count++
  }
  return count
}
