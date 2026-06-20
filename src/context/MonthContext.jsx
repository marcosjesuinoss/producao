import { createContext, useContext, useState } from 'react'

const MonthContext = createContext(null)

export function MonthProvider({ children }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const prev = () => {
    setMonth((m) => {
      if (m === 1) { setYear((y) => y - 1); return 12 }
      return m - 1
    })
  }

  const next = () => {
    setMonth((m) => {
      if (m === 12) { setYear((y) => y + 1); return 1 }
      return m + 1
    })
  }

  return (
    <MonthContext.Provider value={{ year, month, prev, next }}>
      {children}
    </MonthContext.Provider>
  )
}

export const useMonth = () => useContext(MonthContext)
