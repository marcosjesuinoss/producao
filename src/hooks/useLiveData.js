import { useLiveQuery as useDexieLiveQuery } from 'dexie-react-hooks'
import { useDataVersion } from './useDataVersion.js'

/*
  Wrapper em volta do useLiveQuery do Dexie: alem da reatividade automatica
  dele, tambem reexecuta a query sempre que notifyDataChanged() for chamado
  em qualquer lugar do app (ver lib/dataBus.js) — nao dependendo so do
  mecanismo interno do Dexie, que se mostrou pouco confiavel em alguns
  navegadores/aparelhos. Mesma assinatura do useLiveQuery original, so
  trocar o import.
*/
export function useLiveQuery(querier, deps = [], defaultValue) {
  const version = useDataVersion()
  return useDexieLiveQuery(querier, [...deps, version], defaultValue)
}
