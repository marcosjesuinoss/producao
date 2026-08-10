import { createContext, useContext, useState } from 'react'

const MonthContext = createContext(null)

export function MonthProvider({ children }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  // Le "month" do closure (nao de dentro do updater de setMonth) antes de
  // decidir se o ano tambem muda — chamar setYear de dentro do updater de
  // setMonth fazia o StrictMode (que invoca updaters em dobro) decrementar
  // o ano duas vezes ao virar Janeiro->Dezembro.
  const prev = () => {
    if (month === 1) {
      setYear((y) => y - 1)
      setMonth(12)
    } else {
      setMonth((m) => m - 1)
    }
  }

  const next = () => {
    if (month === 12) {
      setYear((y) => y + 1)
      setMonth(1)
    } else {
      setMonth((m) => m + 1)
    }
  }

  return (
    <MonthContext.Provider value={{ year, month, prev, next }}>
      {children}
    </MonthContext.Provider>
  )
}

export const useMonth = () => useContext(MonthContext)
