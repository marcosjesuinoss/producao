// Paleta de cores de destaque selecionaveis (bloco "Aparência" em Ajustes).
// Cada cor tem dois conjuntos de tons — "light" (tema Claro) e "dark"
// (Anoitecer + Escuro, que ja compartilhavam o mesmo tom de marca antes
// dessa cor virar selecionavel).
//
// Regra pra nunca ficar apagado: tema Claro usa tons fundos (600-800) com
// texto branco por cima; temas escuros usam tons claros (400) com texto
// escuro por cima — a cor nunca some no fundo, o texto nunca fica ilegivel.
//
// Campos por tom:
//   brand  — cor solida (icones, aba ativa, links, borda de foco)
//   rgb    — o mesmo em "r, g, b", pra alimentar os niveis de transparencia
//            ja usados no app (rgba(var(--c-brand-rgb), 0.12) etc.)
//   brand2 — parceira analoga, primeiro ponto do gradiente (.btn-brand)
//   fg     — cor do texto que fica EM CIMA do gradiente

export const ACCENTS = {
  verde: {
    label: 'Verde',
    light: { brand: '#15803d', rgb: '21, 128, 61',    brand2: '#0f766e', fg: '#ffffff' },
    dark:  { brand: '#4ade80', rgb: '74, 222, 128',   brand2: '#2dd4bf', fg: '#052e16' },
  },
  vermelho: {
    label: 'Vermelho',
    light: { brand: '#dc2626', rgb: '220, 38, 38',    brand2: '#ea580c', fg: '#ffffff' },
    dark:  { brand: '#ef4444', rgb: '239, 68, 68',    brand2: '#fb7185', fg: '#450a0a' },
  },
  azul: {
    label: 'Azul',
    light: { brand: '#2563eb', rgb: '37, 99, 235',    brand2: '#0891b2', fg: '#ffffff' },
    dark:  { brand: '#60a5fa', rgb: '96, 165, 250',   brand2: '#22d3ee', fg: '#0c223f' },
  },
  amarelo: {
    label: 'Amarelo',
    light: { brand: '#eab308', rgb: '234, 179, 8',    brand2: '#f59e0b', fg: '#1c1917' },
    dark:  { brand: '#facc15', rgb: '250, 204, 21',   brand2: '#fbbf24', fg: '#422006' },
  },
  roxo: {
    label: 'Roxo',
    light: { brand: '#9333ea', rgb: '147, 51, 234',   brand2: '#db2777', fg: '#ffffff' },
    dark:  { brand: '#c084fc', rgb: '192, 132, 252',  brand2: '#f472b6', fg: '#2e1065' },
  },
  marrom: {
    label: 'Marrom',
    light: { brand: '#78350f', rgb: '120, 53, 15',    brand2: '#92400e', fg: '#ffffff' },
    dark:  { brand: '#c68a5c', rgb: '198, 138, 92',   brand2: '#d9a066', fg: '#2a1a0c' },
  },
  laranja: {
    label: 'Laranja',
    light: { brand: '#ea580c', rgb: '234, 88, 12',    brand2: '#d97706', fg: '#ffffff' },
    dark:  { brand: '#fb923c', rgb: '251, 146, 60',   brand2: '#fbbf24', fg: '#431407' },
  },
  cinza: {
    label: 'Cinza',
    light: { brand: '#475569', rgb: '71, 85, 105',    brand2: '#64748b', fg: '#ffffff' },
    dark:  { brand: '#94a3b8', rgb: '148, 163, 184',  brand2: '#cbd5e1', fg: '#0f172a' },
  },
}

export const ACCENT_ORDER = ['verde', 'vermelho', 'azul', 'amarelo', 'roxo', 'marrom', 'laranja', 'cinza']

export const DEFAULT_ACCENT = 'azul'

// "light" -> tom claro; "dark"/"midnight" -> tom escuro (os dois temas
// escuros compartilham o mesmo conjunto de tons).
export function resolveAccentTones(accent, theme) {
  const entry = ACCENTS[accent] ?? ACCENTS[DEFAULT_ACCENT]
  return theme === 'light' ? entry.light : entry.dark
}
