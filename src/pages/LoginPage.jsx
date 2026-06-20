import { useState } from 'react'
import { Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

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
        <div
          className="mx-auto flex items-center justify-center w-14 h-14 rounded-2xl"
          style={{ background: 'var(--c-brand-soft)', color: 'var(--c-brand)' }}
        >
          <Lock size={28} />
        </div>
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>App bloqueado</h1>
        <label className="label sr-only" htmlFor="pin">PIN</label>
        <input
          id="pin"
          type="password"
          inputMode="numeric"
          autoFocus
          className="input text-center text-2xl tracking-widest"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="••••"
        />
        {err && <p className="text-sm" style={{ color: 'var(--accent-red)' }}>PIN incorreto.</p>}
        <button className="btn btn-brand w-full" type="submit">Entrar</button>
      </form>
    </div>
  )
}
