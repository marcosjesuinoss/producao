import { createContext, useContext, useState } from 'react'
import { createRecord, updateRecord } from '../api/localApi.js'
import RecordModal from '../components/RecordModal.jsx'

const Ctx = createContext(null)

export function RecordModalProvider({ children }) {
  const [state, setState] = useState({ open: false, initial: null })

  const open = (initial = null) => setState({ open: true, initial })
  const close = () => setState({ open: false, initial: null })

  const handleSubmit = async (form) => {
    if (state.initial?.id) {
      await updateRecord(state.initial.id, form)
    } else {
      await createRecord(form)
    }
    close()
  }

  return (
    <Ctx.Provider value={{ open }}>
      {children}
      {state.open && (
        <RecordModal initial={state.initial} onSubmit={handleSubmit} onClose={close} />
      )}
    </Ctx.Provider>
  )
}

export const useRecordModal = () => useContext(Ctx)
