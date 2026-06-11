import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

// Tela de desbloqueio por PIN (so aparece quando ha PIN definido e app bloqueado).
export default function LoginPage() {
  const { unlock } = useAuth()
  const [pin, setPin] = useState('')
  const [err, setErr] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    const ok = await unlock(pin)
    setErr(!ok)
    setPin('')
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <form className="card w-full max-w-sm space-y-3 text-center" onSubmit={submit}>
        <div className="text-3xl">🔒</div>
        <h1 className="text-lg font-bold">App bloqueado</h1>
        <label className="label sr-only" htmlFor="pin">PIN</label>
        <input id="pin" type="password" inputMode="numeric" autoFocus className="input text-center text-2xl tracking-widest"
          value={pin} onChange={(e) => setPin(e.target.value)} placeholder="••••" />
        {err && <p className="text-sm" style={{ color: 'var(--c-bad)' }}>PIN incorreto.</p>}
        <button className="btn btn-brand w-full" type="submit">Entrar</button>
      </form>
    </div>
  )
}
