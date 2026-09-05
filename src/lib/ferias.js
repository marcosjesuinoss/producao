import { db, uid } from '../db/db.js'
import { notifyDataChanged } from './dataBus.js'
import { tombstone } from '../api/localApi.js'
import { countBusinessDaysInMonth, countVacationBusinessDays } from './businessDays.js'

/*
  Ferias do gerente. Um periodo e { startDate, endDate } em ISO
  ('YYYY-MM-DD', ambos inclusive) mais um "mode", que responde a pergunta
  que o app nao tem como adivinhar: o que acontece com a META do mes?

    'full'    -> a meta continua a mesma. Como sobram menos dias de
                 trabalho, o ritmo diario necessario SOBE (voce compensa).
    'prorata' -> a meta cai proporcionalmente aos dias uteis que voce
                 efetivamente trabalhou. O ritmo diario continua o mesmo.

  O usuario escolhe o modo a cada periodo (decisao dele, tomada em
  2026-08-24) — bancos tratam ferias de formas diferentes, e ate no mesmo
  banco pode variar por campanha.
*/

export const FERIAS_MODES = {
  full: {
    label: 'Meta cheia',
    short: 'meta cheia',
    description: 'A meta do mês continua a mesma — o ritmo diário sobe nos dias que você trabalha.',
  },
  prorata: {
    label: 'Meta proporcional',
    short: 'meta proporcional',
    description: 'A meta do mês cai na proporção dos dias que você trabalhou — o ritmo diário continua o mesmo.',
  },
}

export const DEFAULT_FERIAS_MODE = 'prorata'

export async function listFerias() {
  const rows = await db.ferias.toArray()
  return rows.sort((a, b) => a.startDate.localeCompare(b.startDate))
}

// So os periodos que encostam no mes (year, month) — um periodo pode
// atravessar a virada do mes, entao o teste e de sobreposicao, nao de
// "comeca dentro do mes".
export function periodsOverlappingMonth(periods, year, month) {
  const mm = String(month).padStart(2, '0')
  const first = `${year}-${mm}-01`
  const last = `${year}-${mm}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`
  return periods.filter((p) => p.startDate <= last && p.endDate >= first)
}

export async function listFeriasForMonth(year, month) {
  return periodsOverlappingMonth(await listFerias(), Number(year), Number(month))
}

export async function createFerias({ startDate, endDate, mode }) {
  const row = {
    id: uid(),
    startDate,
    endDate,
    mode: FERIAS_MODES[mode] ? mode : DEFAULT_FERIAS_MODE,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  await db.ferias.add(row)
  notifyDataChanged()
  return row
}

export async function updateFerias(id, patch) {
  const current = await db.ferias.get(id)
  if (!current) throw new Error('Período não encontrado')
  const next = { ...current, ...patch, updatedAt: Date.now() }
  if (patch.mode && !FERIAS_MODES[patch.mode]) next.mode = current.mode
  await db.ferias.put(next)
  notifyDataChanged()
  return next
}

export async function deleteFerias(id) {
  await db.ferias.delete(id)
  await tombstone('ferias', id)
  notifyDataChanged()
}

// Valida um periodo antes de salvar. Retorna string de erro ou null.
// "existing" permite checar sobreposicao com os periodos ja salvos
// (ignorando o proprio, no caso de edicao).
export function validateFerias({ startDate, endDate }, existing = [], selfId = null) {
  if (!startDate) return 'Informe a data de início.'
  if (!endDate) return 'Informe a data de fim.'
  if (endDate < startDate) return 'A data de fim não pode ser antes da data de início.'
  const clash = existing.find(
    (p) => p.id !== selfId && startDate <= p.endDate && endDate >= p.startDate
  )
  if (clash) return 'Esse período se sobrepõe a outras férias já registradas.'
  return null
}

// Quantos dias corridos o periodo cobre (inclusive nas duas pontas).
export function countCalendarDays({ startDate, endDate }) {
  const [y1, m1, d1] = startDate.split('-').map(Number)
  const [y2, m2, d2] = endDate.split('-').map(Number)
  const a = new Date(y1, m1 - 1, d1)
  const b = new Date(y2, m2 - 1, d2)
  return Math.round((b - a) / 86400000) + 1
}

/*
  Efeito das ferias na meta de um mes. Retorna os numeros que a Evolucao
  usa pra montar a curva de esperado e o ritmo diario.

    businessDays  — dias uteis do mes pelo calendario do banco
    vacationDays  — quantos desses cairam nas ferias
    workingDays   — os que sobraram (o que o gerente realmente trabalha)
    factor        — multiplicador a aplicar na meta ('prorata' encolhe,
                    'full' mantem em 1)

  Quando ha mais de um periodo no mes com modos diferentes, o 'full' de
  qualquer um deles ja obriga a compensar o mes inteiro, entao o modo mais
  "exigente" vence — sem isso, um periodo prorata poderia abater a meta de
  dias que o outro periodo mandou compensar.
*/
export function feriasImpact(year, month, periods) {
  const businessDays = countBusinessDaysInMonth(year, month)
  const vacationDays = countVacationBusinessDays(year, month, periods)
  const workingDays = businessDays - vacationDays

  const anyFull = periods?.some((p) => p.mode === 'full')
  const factor =
    vacationDays === 0 || anyFull || businessDays === 0 ? 1 : workingDays / businessDays

  return { businessDays, vacationDays, workingDays, factor, mode: anyFull ? 'full' : 'prorata' }
}
