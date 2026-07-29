import { createContext, useContext, useState } from 'react'
import { createRecord, updateRecord } from '../api/localApi.js'
import RecordModal from '../components/RecordModal.jsx'
import Toast from '../components/Toast.jsx'
import { useToast } from '../hooks/useToast.js'

const Ctx = createContext(null)

export function RecordModalProvider({ children }) {
  const [state, setState] = useState({ open: false, initial: null })
  const { toast, showToast, hideToast } = useToast()

  const open = (initial = null) => setState({ open: true, initial })
  const close = () => setState({ open: false, initial: null })

  // Se a escrita no banco falhar, o modal fica ABERTO (o usuario nao perde o
  // que digitou) e mostra o erro real — antes disso, uma falha aqui deixava o
  // modal parado sem nenhum aviso, parecendo "travado".
  const handleSubmit = async (form) => {
    try {
      if (state.initial?.id) {
        await updateRecord(state.initial.id, form)
      } else {
        await createRecord(form)
      }
      close()
    } catch (err) {
      showToast(`Erro ao salvar: ${err?.message || err}`, 'error')
    }
  }

  return (
    <Ctx.Provider value={{ open }}>
      {children}
      {state.open && (
        <RecordModal initial={state.initial} onSubmit={handleSubmit} onClose={close} />
      )}
      <Toast toast={toast} onDismiss={hideToast} />
    </Ctx.Provider>
  )
}

export const useRecordModal = () => useContext(Ctx)
