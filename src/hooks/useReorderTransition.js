import { useLayoutEffect, useRef } from 'react'

// FLIP manual e minimo: anima so os itens cuja posicao vertical mudou por
// causa de uma reordenacao (identificada por "orderSignal" mudar de valor),
// sem observers genericos (ResizeObserver/MutationObserver) que acabam
// reagindo a outras mudancas de layout sem relacao — expandir um grupo,
// entrar no modo "Reordenar" (que ja muda a altura do card ao mostrar as
// setas), abrir um picker etc.
//
// O efeito roda em TODO render (sem array de deps) pra manter as posicoes
// registradas sempre atualizadas — sem isso, ao entrar no modo reordenar
// (que altera a altura dos cards) a posicao de referencia ficava
// desatualizada e o delta calculado no proximo movimento saia enorme,
// deixando o transform preso a meio caminho.
//
// Uso: crie um Map de refs (itemRefs.current.set(key, el)) nos itens da
// lista e chame useReorderTransition(itemRefs, algumaStringQueMudaNaOrdem).
export function useReorderTransition(itemRefs, orderSignal) {
  const prevTops = useRef(new Map())
  const prevOrderSignal = useRef(orderSignal)

  useLayoutEffect(() => {
    const shouldAnimate = prevOrderSignal.current !== orderSignal
    const newTops = new Map()
    itemRefs.current.forEach((el, key) => {
      if (el) newTops.set(key, el.getBoundingClientRect().top)
    })

    if (shouldAnimate) {
      newTops.forEach((newTop, key) => {
        const oldTop = prevTops.current.get(key)
        const el = itemRefs.current.get(key)
        if (!el || oldTop == null || oldTop === newTop) return

        const delta = oldTop - newTop
        el.style.transition = 'none'
        el.style.transform = `translateY(${delta}px)`
        // Forca o navegador a aplicar o transform acima antes de tirar a
        // transicao "none" — sem isso os dois estilos colapsam num so frame
        // e nao ha nada pra animar.
        el.getBoundingClientRect()

        requestAnimationFrame(() => {
          el.style.transition = 'transform 300ms cubic-bezier(0.4,0,0.2,1)'
          el.style.transform = ''
        })

        const clearInlineStyles = () => {
          el.style.transition = ''
          el.style.transform = ''
          el.removeEventListener('transitionend', clearInlineStyles)
        }
        el.addEventListener('transitionend', clearInlineStyles)
      })
    }

    prevTops.current = newTops
    prevOrderSignal.current = orderSignal
  })
}
