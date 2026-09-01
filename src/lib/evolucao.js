import { db } from '../db/db.js'
import { VALUE_PRODUCTS } from './format.js'
import { countWorkingDaysInMonth, countWorkingDaysElapsed, isWorkingDay } from './businessDays.js'
import { listFeriasForMonth, feriasImpact } from './ferias.js'

/*
  Agregacao dia a dia por produto — igual em espirito a productBreakdown()
  de summaries.js, mas com uma serie diaria (cumulativo real x cumulativo
  esperado) alem dos totais do mes, pra alimentar a tela "Evolucao".
*/

const pad2 = (n) => String(n).padStart(2, '0')
const daysInMonth = (year, month) => new Date(year, month, 0).getDate()

// Ultimo dia a considerar "realizado": hoje se for o mes corrente, o mes
// inteiro se for um mes passado, zero se for um mes futuro (sem dados ainda).
function referenceDay(year, month) {
  const now = new Date()
  const cy = now.getFullYear()
  const cm = now.getMonth() + 1
  if (year === cy && month === cm) return now.getDate()
  if (year > cy || (year === cy && month > cm)) return 0
  return daysInMonth(year, month)
}

export async function evolucaoBreakdown({ year, month } = {}) {
  const now = new Date()
  const y = Number(year) || now.getFullYear()
  const m = Number(month) || now.getMonth() + 1

  // Ferias entram aqui como uma camada por cima do calendario do banco:
  // dia de ferias deixa de ser "dia trabalhado", entao some da conta de
  // dias uteis, a meta diaria se redistribui e a curva de esperado fica
  // plana durante o periodo (ver lib/businessDays.js e lib/ferias.js).
  const ferias = await listFeriasForMonth(y, m)
  const impact = feriasImpact(y, m, ferias)

  const totalBusinessDays = countWorkingDaysInMonth(y, m, ferias)
  const refDay = referenceDay(y, m)
  const elapsedBusinessDays = countWorkingDaysElapsed(y, m, refDay, ferias)

  let records = await db.records.where({ year: y, month: m }).toArray()
  records = records.filter((r) => !r.ignored)
  const goals = await db.goals.filter((g) => g.year === y && g.month === m).toArray()

  const customProds = await db.products.toArray()
  const productByName = new Map(customProds.map((p) => [p.name, p]))
  const isValueProduct = (name) =>
    productByName.has(name) ? productByName.get(name).useValue : VALUE_PRODUCTS.has(name)

  const map = new Map()
  for (const r of records) {
    const cur = map.get(r.product) || {
      product: r.product, quantity: 0, value: 0, targetQty: 0, targetVal: 0, byDay: new Map(),
    }
    cur.quantity += r.quantity || 0
    cur.value += r.value || 0
    const day = cur.byDay.get(r.date) || { quantity: 0, value: 0 }
    day.quantity += r.quantity || 0
    day.value += r.value || 0
    cur.byDay.set(r.date, day)
    map.set(r.product, cur)
  }
  for (const g of goals) {
    const cur = map.get(g.product) || {
      product: g.product, quantity: 0, value: 0, targetQty: 0, targetVal: 0, byDay: new Map(),
    }
    cur.targetQty += g.targetQuantity || 0
    cur.targetVal += g.targetValue || 0
    map.set(g.product, cur)
  }

  const totalDays = daysInMonth(y, m)

  const products = [...map.values()]
    .filter((b) => b.targetQty > 0 || b.targetVal > 0 || b.quantity > 0 || b.value > 0)
    .map((b) => {
      const useValue = isValueProduct(b.product)
      const realized = useValue ? b.value : b.quantity
      const fullTarget = useValue ? b.targetVal : b.targetQty
      // No modo 'prorata' a meta encolhe na proporcao dos dias trabalhados;
      // no 'full' o factor e 1 e a meta segue cheia (so o ritmo diario sobe,
      // porque o divisor abaixo ja e menor).
      const target = fullTarget * impact.factor
      const dailyTarget = totalBusinessDays > 0 ? target / totalBusinessDays : 0
      const expectedToDate = dailyTarget * elapsedBusinessDays
      const pace = realized - expectedToDate

      let cumulativeActual = 0
      let cumulativeExpected = 0
      const series = []
      for (let day = 1; day <= totalDays; day++) {
        const dateStr = `${y}-${pad2(m)}-${pad2(day)}`
        const dayData = b.byDay.get(dateStr)
        if (dayData) cumulativeActual += useValue ? dayData.value : dayData.quantity
        // Dia de ferias nao soma esperado -> a curva fica plana no periodo.
        if (isWorkingDay(dateStr, ferias)) cumulativeExpected += dailyTarget
        series.push({
          day,
          cumulativeActual: day <= refDay ? cumulativeActual : null,
          cumulativeExpected,
        })
      }

      const prod = productByName.get(b.product)
      return {
        product: b.product,
        productId: prod?.id ?? null,
        useValue,
        realized,
        target,
        // Meta antes do desconto das ferias — a tela mostra as duas quando
        // sao diferentes, pra ninguem achar que a meta "sumiu" sozinha.
        fullTarget,
        dailyTarget,
        expectedToDate,
        pace,
        series,
      }
    })
    .sort((a, b) => b.realized - a.realized)

  return {
    year: y,
    month: m,
    totalBusinessDays,
    elapsedBusinessDays,
    remainingBusinessDays: totalBusinessDays - elapsedBusinessDays,
    refDay,
    totalDays,
    products,
    ferias,
    feriasImpact: impact,
  }
}
