// Preferencia de "agencia padrao" (bloco Registro em Ajustes) — fica so no
// aparelho (localStorage), nao entra no backup, igual ao ultimo nome
// lancado em manager.

const ENABLED_KEY = 'agenciaEnabled'
const VALUE_KEY = 'agenciaDefault'
const DIGITO_KEY = 'digitoEnabled'

export const getAgenciaEnabled = () => localStorage.getItem(ENABLED_KEY) === '1'
export const setAgenciaEnabled = (v) => localStorage.setItem(ENABLED_KEY, v ? '1' : '0')

export const getAgenciaDefault = () => localStorage.getItem(VALUE_KEY) || ''
export const setAgenciaDefault = (v) => localStorage.setItem(VALUE_KEY, String(v ?? '').replace(/\D/g, '').slice(0, 4))

// Padrao ativado (== comportamento de antes desse toggle existir): so fica
// desativado se a pessoa explicitamente desligar.
export const getDigitoEnabled = () => localStorage.getItem(DIGITO_KEY) !== '0'
export const setDigitoEnabled = (v) => localStorage.setItem(DIGITO_KEY, v ? '1' : '0')

// "1234567" -> "123456-7" (ultimo digito = verificador, aparece so com 2+
// digitos no corpo — com 1 so digito ainda nao da pra saber se e o
// verificador ou o comeco da conta).
const splitCheckDigit = (digits) => {
  if (digits.length <= 1) return digits
  return `${digits.slice(0, -1)}-${digits.slice(-1)}`
}

// Mascara do campo "Agencia / Conta do produto": digita so numero, "/" e
// "-" aparecem sozinhos (esse ultimo so quando digitoEnabled). Com agencia
// ativada: 4 primeiros digitos = agencia, resto = conta (max 8) + digito
// verificador (1, se digitoEnabled) = 13 no total. Sem agencia: tudo vira
// conta (max 8) + digito (1, se digitoEnabled) = 9 total. As duas opcoes
// sao independentes — funcionam em qualquer combinacao.
export function formatAccountMask(raw, agenciaEnabled, digitoEnabled = true) {
  const digits = String(raw ?? '').replace(/\D/g, '')
  const formatConta = (d) => (digitoEnabled ? splitCheckDigit(d) : d)
  if (!agenciaEnabled) {
    return formatConta(digits.slice(0, 9))
  }
  if (digits.length <= 4) return digits
  const agencia = digits.slice(0, 4)
  const resto = digits.slice(4, 13)
  return `${agencia} / ${formatConta(resto)}`
}

// Separa o valor salvo em { agencia, conta } pros relatorios (CSV/PDF)
// mostrarem em colunas distintas. Registros com "/" (agencia ativada na
// hora do lancamento) tem os dois; registros antigos ou sem agencia
// (sem "/") tem so a conta, agencia fica vazia.
export function splitAccount(account) {
  const str = String(account ?? '').trim()
  const i = str.indexOf('/')
  if (i === -1) return { agencia: '', conta: str }
  return { agencia: str.slice(0, i).trim(), conta: str.slice(i + 1).trim() }
}

// Acha a posicao de cursor no texto mascarado que corresponde a "n" digitos
// digitados antes dele — pula os separadores auto-inseridos logo depois do
// n-esimo digito (comportamento padrao de campo com mascara).
export function accountCursorForDigitCount(masked, n) {
  if (n <= 0) return 0
  let count = 0
  for (let i = 0; i < masked.length; i++) {
    if (/\d/.test(masked[i])) {
      count++
      if (count === n) {
        let j = i + 1
        while (j < masked.length && !/\d/.test(masked[j])) j++
        return j
      }
    }
  }
  return masked.length
}
