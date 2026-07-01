# Controle de Produção — PWA offline-first

PWA instalável para um gerente bancário registrar e acompanhar a **produção do mês** (e do ano), com **metas**, **somatórios**, **gráficos Meta × Realizado**, **exportação CSV** e **tema claro/escuro**. Funciona 100% offline — os dados ficam no próprio dispositivo (IndexedDB).

## Stack

| Necessidade | Tecnologia |
|---|---|
| Frontend | React 18 + Vite |
| UI / tema | Tailwind CSS (`darkMode: 'class'`) + CSS variables |
| Banco local | IndexedDB via **Dexie.js** |
| Gráficos | **Chart.js** + react-chartjs-2 |
| PWA / Service Worker | **Workbox** via `vite-plugin-pwa` |
| CSV | **papaparse** |
| Roteamento | react-router-dom |

## Como rodar (build e dev)

Pré-requisito: **Node 18+**.

```bash
npm install
npm run dev        # http://localhost:5173  (SW ativo em dev)
npm run build      # gera /dist (produção, com service worker Workbox)
npm run preview    # serve /dist localmente para testar o PWA
```

Na primeira execução o app cria **dados de teste** automaticamente (vários meses do ano corrente). Para recriar/limpar use **Ajustes → Dados**.

## Instalar como PWA

1. Rode `npm run build` e depois `npm run preview` (ou faça deploy de `/dist` em qualquer hosting estático HTTPS).
2. Abra no Chrome/Edge (desktop ou Android).
3. Clique no ícone **Instalar** na barra de endereço, ou menu ⋮ → *Instalar app*.
4. No iOS/Safari: *Compartilhar → Adicionar à Tela de Início*.
5. Depois de instalado, abra o app e **ative o modo avião** — ele continua funcionando (offline-first).

> O `service worker` é gerado pelo Workbox no build: precache dos assets + `NetworkFirst` para navegação e `StaleWhileRevalidate` para scripts/estilos (ver `vite.config.js`).

## Estrutura de pastas

```
controle-producao/
├─ index.html
├─ vite.config.js          # plugin React + VitePWA/Workbox + manifest
├─ tailwind.config.js      # darkMode: 'class'
├─ postcss.config.js
├─ public/
│  ├─ favicon.svg
│  ├─ icon-192.svg
│  └─ icon-512.svg
└─ src/
   ├─ main.jsx             # providers (Theme, Auth, Router)
   ├─ App.jsx              # rotas + status online/offline + seed
   ├─ index.css           # Tailwind + paletas (CSS variables) claro/escuro
   ├─ db/db.js            # Dexie (records, goals, users)
   ├─ api/localApi.js     # "endpoints" locais (CRUD, summary, sync)
   ├─ lib/
   │  ├─ summaries.js     # queries de somatórios mensal/anual/geral
   │  ├─ csv.js           # export CSV (papaparse)
   │  ├─ seed.js          # dados de teste
   │  └─ format.js        # produtos, meses, formatação BRL
   ├─ context/
   │  ├─ ThemeContext.jsx # tema (localStorage)
   │  └─ AuthContext.jsx  # PIN local opcional (SHA-256)
   ├─ components/
   │  ├─ Header.jsx  ThemeToggle.jsx  Filters.jsx
   │  ├─ SummaryCards.jsx
   │  ├─ RecordForm.jsx   # AddRecordForm
   │  ├─ RecordList.jsx   # ListRecords
   │  └─ charts/ MonthlyGoalChart · AnnualLineChart · ProductChart
   └─ pages/
      ├─ HomePage.jsx     # resumo do mês
      ├─ RecordsPage.jsx  # CRUD + filtros + export CSV
      ├─ GoalsPage.jsx    # metas por produto
      ├─ ChartsPage.jsx   # gráficos Meta × Realizado
      ├─ SettingsPage.jsx # PIN, seed, sync, limpar
      └─ LoginPage.jsx    # desbloqueio por PIN
```

## Modelo de dados (JSON)

**ProductionRecord**
```json
{
  "id": "f1c2…uuid",
  "date": "2026-06-11",
  "year": 2026,
  "month": 6,
  "product": "Seguro de Vida",
  "account": "AG 0234 / GER 17",
  "manager": "Marco Silva",
  "quantity": 3,
  "value": 1850.00,
  "notes": "renovação",
  "createdAt": 1718000000000,
  "updatedAt": 1718000000000,
  "synced": false
}
```

**Goal**
```json
{
  "id": "a9b8…uuid",
  "year": 2026,
  "month": 6,
  "product": "Seguro de Vida",
  "manager": "Marco Silva",
  "targetQuantity": 12,
  "targetValue": 18000,
  "updatedAt": 1718000000000
}
```

**User**
```json
{
  "id": "u1",
  "name": "Marco Silva",
  "pinHash": "sha256…",
  "theme": "dark"
}
```
> No app, `theme` fica no `localStorage` e o `pinHash` no `localStorage` (chave `pinHash`). A tabela `users` está disponível no Dexie para evoluções.

## "Endpoints" locais (em `src/api/localApi.js`)

| REST equivalente | Função local |
|---|---|
| `GET /records` | `listRecords(filters)` |
| `POST /records` | `createRecord(payload)` |
| `PUT /records/:id` | `updateRecord(id, patch)` |
| `DELETE /records/:id` | `deleteRecord(id)` |
| `GET /summary?period=monthly` | `getSummary('monthly', f)` |
| `GET /summary?period=annual` | `getSummary('annual', f)` |
| `GET /goals` | `listGoals(filters)` |
| `POST /goals` (upsert) | `upsertGoal(payload)` |
| `POST /export?format=csv` | `exportCsv(records)` (`lib/csv.js`) |

## Queries de somatórios (Dexie)

```js
// MENSAL (mês vigente)
const recs = await db.records.where({ year: 2026, month: 6 }).toArray()
const mensal = recs.reduce((a, r) => ({
  quantity: a.quantity + r.quantity,
  value: a.value + (r.value || 0)
}), { quantity: 0, value: 0 })

// ANUAL (todos os meses do ano corrente)
const ano = await db.records.where('year').equals(2026).toArray()
const anual = ano.reduce((s, r) => s + r.quantity, 0)

// GERAL (todas as produções)
const tudo = await db.records.toArray()
const geral = tudo.reduce((s, r) => s + r.quantity, 0)
```
Implementação completa (com meta, %, diferença e quebra por mês/produto) em `src/lib/summaries.js`.

## Exemplo de CSV exportado

Delimitador `;` + BOM (abre certo no Excel pt-BR):

```csv
data;produto;conta;gerente;quantidade;valor;observacoes
2026-06-11;Seguro de Vida;AG 0234 / GER 17;Marco Silva;3;1850;renovação
2026-06-10;Cartao de Credito;AG 0234 / GER 17;Marco Silva;5;;meta batida
2026-06-09;Conta Corrente;AG 0234 / GER 17;Marco Silva;2;;
```

**Como exportar:** aba **Registros** → ajuste os filtros → botão **⬇️ Exportar CSV**. O arquivo respeita os filtros ativos.

## Paletas sugeridas (em `src/index.css`)

**Tema claro**
| Token | Cor |
|---|---|
| Fundo `--c-bg` | `#f1f5f9` |
| Superfície | `#ffffff` |
| Texto `--c-fg` | `#0f172a` |
| Marca `--c-brand` | `#0f766e` (teal-700) |
| Bom / Ruim | `#15803d` / `#b91c1c` |

**Tema escuro**
| Token | Cor |
|---|---|
| Fundo `--c-bg` | `#0b1220` |
| Superfície | `#131c2e` |
| Texto `--c-fg` | `#e6edf6` |
| Marca `--c-brand` | `#2dd4bf` (teal-400) |
| Bom / Ruim | `#4ade80` / `#f87171` |

**Alternar tema:** botão 🌙/☀️ no header. A escolha persiste no `localStorage` (`theme`). Botões **A- / A+** ajustam a fonte (acessibilidade), também persistidos.

## Guia de testes manuais

1. **Instalação PWA** — `npm run build && npm run preview`, instalar pelo navegador, abrir o app instalado.
2. **Offline** — com o app aberto, ativar modo avião / DevTools → Network → *Offline*; recarregar: deve carregar e operar normalmente.
3. **CRUD** — em *Registros*: adicionar, editar (✏️) e excluir (🗑️) um registro; a lista atualiza na hora.
4. **Filtros** — filtrar por ano/mês/produto/conta e conferir a contagem.
5. **Somatórios** — em *Resumo*: validar Realizado(mês), Meta(mês), Diferença, Anual e Geral conferindo com os registros.
6. **Metas** — em *Metas*: definir meta de um produto e ver a coluna **%** (meta realizada) recalcular.
7. **Gráficos** — em *Gráficos*: ver barras Meta × Realizado por mês, linha do acumulado e barras por produto; passar o mouse mostra tooltip.
8. **CSV** — exportar com filtros aplicados e abrir no Excel (acentos corretos, `;`).
9. **Tema** — alternar claro/escuro: persiste após recarregar; os gráficos acompanham o tema.
10. **Fonte** — A+/A- altera o tamanho e persiste.
11. **PIN (opcional)** — em *Ajustes*, definir PIN; recarregar deve pedir o PIN; testar errado/certo; remover PIN.
12. **Sync** — *Ajustes → Sincronizar agora* marca registros pendentes como sincronizados (`synced: true`).

## Critérios de aceitação cobertos

- ✅ CRUD funcionando offline (IndexedDB/Dexie)
- ✅ Somatórios mensal, anual e geral
- ✅ Gráficos Meta × Realizado responsivos
- ✅ Tema claro/escuro alternável e persistente
- ✅ Export CSV dos registros filtrados
- ✅ Metas por produto com % realizada automática
- ✅ PWA instalável + service worker (Workbox)
