import { useRef, useState } from 'react'

// Fica 10s na tela (dá tempo de ler mensagens mais longas), mas some antes
// se o usuário clicar nele ou rolar a tela (ver Toast.jsx).
const DURATION = 10000

export function useToast() {
  const [toast, setToast] = useState(null)
  const timeoutRef = useRef(null)

  const showToast = (message, kind = 'success') => {
    // Cancela o timer do toast anterior — senão, dois toasts em sequência
    // rápida fariam o timer do primeiro fechar o segundo antes da hora.
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setToast({ message, kind })
    timeoutRef.current = setTimeout(() => setToast(null), DURATION)
  }

  const hideToast = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setToast(null)
  }

  return { toast, showToast, hideToast }
}
