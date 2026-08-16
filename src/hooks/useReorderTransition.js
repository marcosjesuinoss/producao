import { useLayoutEffect, useRef } from 'react'

// Acha o ancestral com scroll proprio (overflow-y auto/scroll) — e em
// relacao a ELE, nao a janela, que as posicoes dos itens sao medidas (ver
// getDocTop abaixo). Sobe so ate achar o primeiro, ja que todo item da
// lista fica dentro do mesmo container rolavel.
function getScrollContainer(el) {
  let node = el.parentElement
  while (node) {
    const overflowY = getComputedStyle(node).overflowY
    if (overflowY === 'auto' || overflowY === 'scroll') return node
    node = node.parentElement
  }
  return document.scrollingElement || document.documentElement
}

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
// As posicoes sao guardadas relativas ao CONTEUDO do container rolavel
// (getBoundingClientRect().top + scrollTop), nao a janela crua: rolar a
// lista sozinho nao muda esse numero, so uma reordenacao/inserção real
// muda. Antes disso, um simples scroll do usuario entre uma reordenacao e
// a proxima deixava "prevTops" desatualizado em relacao a janela — no
// proximo clique que de fato mudasse a ordem, o delta calculado incluia
// por engano a distancia rolada nesse meio tempo, fazendo a lista inteira
// "voltar" visualmente pra posicao antiga por um instante antes de
// corrigir sozinha (o pulo ao clicar em "Mostrar zerados" pela primeira
// vez depois de rolar a tela).
//
// Uso: crie um Map de refs (itemRefs.current.set(key, el)) nos itens da
// lista e chame useReorderTransition(itemRefs, algumaStringQueMudaNaOrdem).
export function useReorderTransition(itemRefs, orderSignal) {
  const prevTops = useRef(new Map())
  const prevOrderSignal = useRef(orderSignal)

  useLayoutEffect(() => {
    const shouldAnimate = prevOrderSignal.current !== orderSignal
    const newTops = new Map()
    let scrollTop = null
    itemRefs.current.forEach((el, key) => {
      if (!el) return
      if (scrollTop == null) scrollTop = getScrollContainer(el).scrollTop
      newTops.set(key, el.getBoundingClientRect().top + scrollTop)
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
