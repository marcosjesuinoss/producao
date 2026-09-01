import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, Cloud, UserPlus, BarChart3 } from 'lucide-react'

// Tela ainda sem funcionalidade — o "modo equipe" depende de backend
// (autenticacao + banco compartilhado + sincronizacao), o que sai do
// modelo 100% local/offline do app hoje. Aqui fica so a porta de entrada,
// pra o recurso ter lugar definido na navegacao desde ja.
const PREVIEW = [
  { icon: UserPlus, text: 'Convidar os gerentes da sua equipe pelo app' },
  { icon: Cloud, text: 'A produção deles chega automaticamente, sem enviar arquivo' },
  { icon: BarChart3, text: 'Ver metas e produção da equipe inteira num lugar só' },
]

export default function EquipePage() {
  const navigate = useNavigate()

  return (
    <section className="space-y-4 max-w-xl">
      <div className="flex items-center gap-2">
        <button className="btn px-2 py-2" onClick={() => navigate('/ajustes')} aria-label="Voltar">
          <ArrowLeft size={16} />
        </button>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Equipe</h2>
      </div>

      <div className="card space-y-4">
        <div className="flex flex-col items-center text-center gap-2 pt-2">
          <div style={{ padding: '12px', background: 'rgba(var(--c-brand-rgb),0.12)', borderRadius: '16px' }}>
            <Users size={28} style={{ color: 'var(--c-brand)' }} />
          </div>
          <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
            Gestão de equipe
          </p>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '99px',
              background: 'rgba(var(--c-brand-rgb),0.15)',
              color: 'var(--c-brand)',
            }}
          >
            em breve
          </span>
        </div>

        <div className="space-y-2.5 pt-1">
          {PREVIEW.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-start gap-2.5">
              <Icon size={15} style={{ color: 'var(--c-brand)', flexShrink: 0, marginTop: '2px' }} />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{text}</span>
            </div>
          ))}
        </div>

        <p className="text-xs pt-1" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--c-border)', paddingTop: '12px' }}>
          Hoje o app funciona 100% no seu aparelho, sem internet. A equipe online precisa de
          servidor, então virá numa atualização futura — enquanto isso, dá para receber a
          produção dos outros gerentes por arquivo em Ajustes → Backup.
        </p>
      </div>
    </section>
  )
}
