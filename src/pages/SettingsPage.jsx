import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { seedIfEmpty, resetAll } from '../lib/seed.js'
import { syncNow } from '../api/localApi.js'

// Ajustes — PIN, dados de teste, sincronizacao.
export default function SettingsPage() {
  const { hasPin, setPin, removePin } = useAuth()
  const [pin, setPinValue] = useState('')
  const [msg, setMsg] = useState('')

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 2500) }

  return (
    <section className="space-y-4 max-w-xl">
      <h2 className="text-xl font-bold">Ajustes</h2>

      <div className="card space-y-3">
        <h3 className="font-semibold">Seguranca (PIN local opcional)</h3>
        <p className="text-sm text-muted">O PIN fica somente neste dispositivo (hash SHA-256).</p>
        {!hasPin ? (
          <div className="flex gap-2">
            <input type="password" inputMode="numeric" className="input" placeholder="Defina um PIN"
              value={pin} onChange={(e) => setPinValue(e.target.value)} aria-label="Novo PIN" />
            <button className="btn btn-brand" disabled={pin.length < 4}
              onClick={async () => { await setPin(pin); setPinValue(''); flash('PIN definido.') }}>
              Definir
            </button>
          </div>
        ) : (
          <button className="btn" onClick={() => { removePin(); flash('PIN removido.') }}>Remover PIN</button>
        )}
      </div>

      <div className="card space-y-3">
        <h3 className="font-semibold">Dados</h3>
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={async () => flash((await seedIfEmpty()) ? 'Dados de teste criados.' : 'Ja existem dados.')}>
            Gerar dados de teste
          </button>
          <button className="btn btn-brand" onClick={async () => { const r = await syncNow(); flash(`Sync: ${r.synced} registro(s).`) }}>
            Sincronizar agora
          </button>
          <button className="btn" style={{ color: 'var(--c-bad)' }}
            onClick={async () => { if (confirm('Apagar TODOS os dados locais?')) { await resetAll(); flash('Tudo apagado.') } }}>
            Limpar tudo
          </button>
        </div>
      </div>

      {msg && <p className="text-sm" style={{ color: 'var(--c-good)' }} role="status">{msg}</p>}
    </section>
  )
}
