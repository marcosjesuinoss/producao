import { Component } from 'react'

/*
  Rede de seguranca: sem isso, qualquer erro de render em QUALQUER componente
  faz o React desmontar a arvore inteira -> tela branca, sem nenhuma pista do
  que quebrou. Aqui mostramos uma tela de recuperacao com o erro real, pra dar
  pra reportar o problema em vez de só reabrir o app às cegas.
*/
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#0b1220',
          color: '#e2e8f0',
        }}
      >
        <div style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
          <p style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Algo deu errado</p>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '16px' }}>
            O app encontrou um erro inesperado. Seus dados continuam salvos no aparelho — nada foi perdido.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              background: '#0f766e',
              color: '#fff',
              fontWeight: 600,
              border: 'none',
              marginBottom: '16px',
              cursor: 'pointer',
            }}
          >
            Recarregar app
          </button>
          <details style={{ textAlign: 'left', fontSize: '11px', color: '#64748b', background: '#111827', borderRadius: '8px', padding: '10px' }}>
            <summary style={{ cursor: 'pointer', marginBottom: '6px' }}>Detalhes do erro (envie um print)</summary>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
              {String(this.state.error?.stack || this.state.error)}
            </pre>
          </details>
        </div>
      </div>
    )
  }
}
