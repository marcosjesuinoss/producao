const target = new EventTarget()

/*
  Sinal manual de "algo mudou no banco". O useLiveQuery do Dexie deveria
  reagir sozinho a qualquer escrita (via storagemutated/BroadcastChannel),
  mas isso se mostrou pouco confiavel em alguns navegadores/aparelhos (ex.:
  relato de registros que só aparecem apos reabrir o app no Samsung
  Internet) — os dados sao gravados certinho, so a notificacao de mudanca
  que as vezes nao chega. Este bus e um mecanismo independente disso: quem
  escreve no banco chama notifyDataChanged() explicitamente, e useLiveData
  (ver hooks/useLiveData.js) usa isso pra forcar as queries a reexecutar.
*/
export const notifyDataChanged = () => target.dispatchEvent(new Event('change'))

export const onDataChanged = (cb) => {
  target.addEventListener('change', cb)
  return () => target.removeEventListener('change', cb)
}
