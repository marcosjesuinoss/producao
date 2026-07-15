import { useEffect, useState } from 'react'
import { onDataChanged } from '../lib/dataBus.js'

// Numero que muda toda vez que notifyDataChanged() e chamado em qualquer
// lugar do app — usado como dependencia extra em useLiveData.
export function useDataVersion() {
  const [version, setVersion] = useState(0)
  useEffect(() => onDataChanged(() => setVersion((v) => v + 1)), [])
  return version
}
