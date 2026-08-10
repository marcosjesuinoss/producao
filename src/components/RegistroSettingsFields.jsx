import { useState } from 'react'
import { getAgenciaEnabled, setAgenciaEnabled, getAgenciaDefault, setAgenciaDefault, getDigitoEnabled, setDigitoEnabled } from '../lib/agencia.js'
import InfoButton from './InfoButton.jsx'

// Campos do bloco "Registros" (Ajustes) — extraidos pra um componente
// proprio pra poderem ser reaproveitados tambem no popup de atalho aberto
// direto da tela de Registros (RegistroSettingsModal.jsx). As duas telas
// leem/gravam as MESMAS chaves de localStorage via lib/agencia.js — o
// estado local de cada instancia so inicializa a partir de la, entao uma
// alteracao feita num lugar sempre aparece no outro na proxima vez que ele
// for aberto (nunca ficam montados os dois ao mesmo tempo).
export default function RegistroSettingsFields() {
  const [agenciaEnabled, setAgenciaEnabledState] = useState(getAgenciaEnabled())
  const [agenciaValue, setAgenciaValue] = useState(getAgenciaDefault())
  const [digitoEnabled, setDigitoEnabledState] = useState(getDigitoEnabled())
  const [infoOpen, setInfoOpen] = useState(null) // null | 'agencia' | 'digito'

  return (
    <>
      <div className="flex items-center gap-2">
        <label className="switch">
          <input
            id="s-agencia-enabled"
            type="checkbox"
            checked={agenciaEnabled}
            onChange={(e) => {
              const v = e.target.checked
              setAgenciaEnabledState(v)
              setAgenciaEnabled(v)
            }}
          />
          <span className="switch-track" aria-hidden />
        </label>
        <label
          htmlFor="s-agencia-enabled"
          className="text-sm font-medium cursor-pointer select-none"
          style={{ color: 'var(--text-secondary)' }}
        >
          Solicitar agência nos registros
        </label>
        <InfoButton
          id="agencia"
          open={infoOpen}
          onToggle={setInfoOpen}
          description='Quando ativado, o campo "Agência / Conta do produto" separa os 4 primeiros dígitos digitados como agência e o resto como conta. Se você definir uma agência abaixo, ela vem pré-preenchida em todo registro novo — mas dá pra apagar na hora, se precisar.'
        />
      </div>
      <div className="flex items-center gap-2">
        {/* Espaçador do mesmo tamanho do switch (.switch = 42px) — alinha
            "Minha agência" na mesma coluna dos rótulos "Solicitar..." */}
        <div style={{ width: '42px' }} aria-hidden />
        <label htmlFor="s-agencia-value" className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Minha agência
        </label>
        <input
          id="s-agencia-value"
          type="text"
          inputMode="numeric"
          className="input !w-24"
          placeholder="1234"
          disabled={!agenciaEnabled}
          style={!agenciaEnabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
          value={agenciaValue}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 4)
            setAgenciaValue(digits)
            setAgenciaDefault(digits)
          }}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="switch">
          <input
            id="s-digito-enabled"
            type="checkbox"
            checked={digitoEnabled}
            onChange={(e) => {
              const v = e.target.checked
              setDigitoEnabledState(v)
              setDigitoEnabled(v)
            }}
          />
          <span className="switch-track" aria-hidden />
        </label>
        <label
          htmlFor="s-digito-enabled"
          className="text-sm font-medium cursor-pointer select-none"
          style={{ color: 'var(--text-secondary)' }}
        >
          Solicitar dígito nas contas
        </label>
        <InfoButton
          id="digito"
          open={infoOpen}
          onToggle={setInfoOpen}
          description='Ativado (padrão), a conta exige um dígito verificador depois do "-" (ex: 1-2). Desativado, a conta aceita só números, sem dígito nem separador (ex: 12).'
        />
      </div>
    </>
  )
}
