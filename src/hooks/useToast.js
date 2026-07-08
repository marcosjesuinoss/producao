import { useState } from 'react'

// kind: 'success' | 'error' — erro fica mais tempo na tela pra dar tempo de ler.
export function useToast() {
  const [toast, setToast] = useState(null)

  const showToast = (message, kind = 'success') => {
    setToast({ message, kind })
    setTimeout(() => setToast(null), kind === 'error' ? 3500 : 2500)
  }

  return { toast, showToast }
}
