import { useState } from 'react'
import InfoButton from './InfoButton.jsx'

// Campos do bloco "Gráficos" (Ajustes) — extraidos pra um componente
// proprio pra poderem ser reaproveitados tambem no popup de atalho aberto
// direto da tela de Evolução (GraficosSettingsModal.jsx). Controlado (nao
// gerencia o proprio enabled/disabled): quem usa passa o valor atual e o
// callback de mudança — na tela de Evolução isso e o que permite o
// grafico ja em tela reagir na hora ao toggle, sem precisar reabrir a
// pagina. Quem grava no localStorage (lib/chartSettings.js) e sempre quem
// chama este componente, nao ele mesmo.
export default function GraficosSettingsFields({ projecaoEnabled, marcador90Enabled, onProjecaoChange, onMarcador90Change }) {
  const [infoOpen, setInfoOpen] = useState(null) // null | 'projecao' | 'marcador90'

  return (
    <>
      <div className="flex items-center gap-2">
        <label className="switch">
          <input
            id="s-projecao-enabled"
            type="checkbox"
            checked={projecaoEnabled}
            onChange={(e) => onProjecaoChange(e.target.checked)}
          />
          <span className="switch-track" aria-hidden />
        </label>
        <label
          htmlFor="s-projecao-enabled"
          className="text-sm font-medium cursor-pointer select-none"
          style={{ color: 'var(--text-secondary)' }}
        >
          Projeção
        </label>
        <InfoButton
          id="projecao"
          open={infoOpen}
          onToggle={setInfoOpen}
          description="Mostra no gráfico da Evolução uma linha que projeta, pelo ritmo real de produção até hoje, quanto você deve fazer até o fim do mês — nunca passa de 100% da meta."
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="switch">
          <input
            id="s-marcador90-enabled"
            type="checkbox"
            checked={marcador90Enabled}
            onChange={(e) => onMarcador90Change(e.target.checked)}
          />
          <span className="switch-track" aria-hidden />
        </label>
        <label
          htmlFor="s-marcador90-enabled"
          className="text-sm font-medium cursor-pointer select-none"
          style={{ color: 'var(--text-secondary)' }}
        >
          Marcador de 90%
        </label>
        <InfoButton
          id="marcador90"
          open={infoOpen}
          onToggle={setInfoOpen}
          description="Mostra no gráfico da Evolução uma linha de referência fixa em 90% da meta do mês."
        />
      </div>
    </>
  )
}
