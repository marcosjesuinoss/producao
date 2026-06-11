import { createContext, useContext, useEffect, useState } from 'react'

/*
  Autenticacao leve por PIN local (opcional).
  - O PIN nunca sai do dispositivo: guardamos apenas um hash SHA-256.
  - Se nenhum PIN foi definido, o app abre direto (auth opcional).
*/
const AuthContext = createContext(null)

async function sha256(text) {
  const data = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function AuthProvider({ children }) {
  const [pinHash, setPinHash] = useState(() => localStorage.getItem('pinHash') || '')
  const [unlocked, setUnlocked] = useState(() => !localStorage.getItem('pinHash'))

  useEffect(() => {
    if (pinHash) localStorage.setItem('pinHash', pinHash)
    else localStorage.removeItem('pinHash')
  }, [pinHash])

  const setPin = async (pin) => {
    setPinHash(await sha256(pin))
    setUnlocked(true)
  }
  const removePin = () => {
    setPinHash('')
    setUnlocked(true)
  }
  const unlock = async (pin) => {
    const ok = (await sha256(pin)) === pinHash
    setUnlocked(ok)
    return ok
  }
  const lock = () => pinHash && setUnlocked(false)

  return (
    <AuthContext.Provider value={{ hasPin: !!pinHash, unlocked, setPin, removePin, unlock, lock }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
