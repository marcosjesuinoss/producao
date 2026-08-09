// Preferencias dos graficos da tela Evolução (bloco "Gráficos" em Ajustes) —
// ficam so no aparelho (localStorage), igual as preferencias de agencia.

const PROJECAO_KEY = 'chartProjecaoEnabled'
const MARCADOR90_KEY = 'chartMarcador90Enabled'

// Ambos nascem ativados — desligar e que muda o comportamento atual.
export const getProjecaoEnabled = () => localStorage.getItem(PROJECAO_KEY) !== '0'
export const setProjecaoEnabled = (v) => localStorage.setItem(PROJECAO_KEY, v ? '1' : '0')

export const getMarcador90Enabled = () => localStorage.getItem(MARCADOR90_KEY) !== '0'
export const setMarcador90Enabled = (v) => localStorage.setItem(MARCADOR90_KEY, v ? '1' : '0')
