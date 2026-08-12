import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Settings } from 'lucide-react'
import { getImagemGerente, setImagemGerente, getImagemAgencia, setImagemAgencia } from '../lib/producaoDia.js'

// Popup de confirmacao do card "Produção do Dia" — 3 caminhos (Sim / Não /
// Configurar imagem), por isso nao reaproveita o ConfirmDialog generico
// (que so tem 2 botoes). "Configurar imagem" troca pra uma segunda tela,
// dentro do mesmo popup, com nome do gerente + agencia (salvos no
// aparelho) que aparecem no cabecalho da imagem gerada.
export default function ProducaoDiaModal({ breakdown, onConfirm, onCancel }) {
  const [view, setView] = useState('confirm') // 'confirm' | 'config'
  const [gerente, setGerenteValue] = useState(getImagemGerente())
  const [agencia, setAgenciaValue] = useState(getImagemAgencia())

  const handleSaveConfig = () => {
    setImagemGerente(gerente)
    setImagemAgencia(agencia)
    setView('confirm')
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
        onClick={onCancel}
        aria-hidden
      />
      <div
        className="relative w-full max-w-xs space-y-4 p-5"
        style={{ background: 'var(--c-surface)', borderRadius: '20px', boxShadow: '0 24px 48px rgba(0,0,0,0.4)' }}
      >
        {view === 'confirm' ? (
          <>
            <div>
              <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                Gerar relatório de produção diária?
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {breakdown.totalRecords} {breakdown.totalRecords === 1 ? 'lançamento hoje' : 'lançamentos hoje'}.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <button className="btn flex-1" onClick={onCancel}>Não</button>
                <button className="btn btn-brand flex-1" onClick={onConfirm}>Sim</button>
              </div>
              <button
                className="btn w-full text-sm flex items-center justify-center gap-1.5"
                onClick={() => setView('config')}
              >
                <Settings size={14} />
                Configurar imagem
              </button>
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Configurar imagem</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Aparecem no cabeçalho da imagem gerada. Fica salvo neste aparelho.
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label" htmlFor="pd-gerente">Nome do gerente</label>
                <input
                  id="pd-gerente"
                  className="input"
                  placeholder="Ex: Carlos"
                  value={gerente}
                  onChange={(e) => setGerenteValue(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="pd-agencia">Agência</label>
                <input
                  id="pd-agencia"
                  className="input"
                  inputMode="numeric"
                  placeholder="Ex: 6513"
                  value={agencia}
                  onChange={(e) => setAgenciaValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn flex-1" onClick={() => setView('confirm')}>Voltar</button>
              <button className="btn btn-brand flex-1" onClick={handleSaveConfig}>Salvar</button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
