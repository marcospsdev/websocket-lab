# WebSocket Lab em React

Laboratório de dados em tempo real via WebSocket num app React, com a API pública da Binance.

---

## Sumário

- [Visão geral](#visão-geral)
- [Rotas](#rotas)
- [Stack e versões](#stack-e-versões)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Primeiros passos](#primeiros-passos)
- [Scripts](#scripts)
- [Autor](#autor)

---

## Visão geral

Projeto de estudo para praticar requisições em tempo real via **WebSocket** num app React, consumindo os streams públicos de mercado da [Binance](https://binance-docs.github.io/apidocs/spot/en/#websocket-market-streams) (sem autenticação, sem custo, dados reais).

A organização em camadas (`endpoints.ts`, client de transporte, serviço de domínio, hooks genéricos e de domínio) segue o padrão comum de um app React com camada REST, adaptado para dados que chegam por stream contínuo em vez de requisição pontual.

Principais pontos:

- Uma única conexão física multiplexando vários streams (contagem de referências por stream)
- Reconexão automática com backoff exponencial (1s, 2s, 4s… até 30s)
- Hooks de domínio que normalizam o payload cru da Binance antes de chegar aos componentes
- Tela de eco para testar o envio de mensagens pelo cliente

A documentação da arquitetura, com o porquê de cada decisão, está em [`docs/ARQUITETURA.md`](./docs/ARQUITETURA.md). Há também um comparativo em [`WEBSOCKET-VS-HTTP.md`](./WEBSOCKET-VS-HTTP.md).

Concluído em 08/2026.

---

## Rotas

| Rota | O que mostra |
| --- | --- |
| `/` | Dashboard com 4 cards de preço ao vivo (BTC, ETH, SOL, BNB) dividindo a mesma conexão |
| `/trades` | Feed de trades executados em tempo real para um par escolhido |
| `/klines` | Tabela de candles (OHLC) rolantes, com o candle atual atualizando até fechar |
| `/echo` | Envio de mensagens JSON para o serviço de eco público do Postman e leitura da resposta |

Abra o DevTools → Network → filtro **WS** enquanto navega para ver os frames de `SUBSCRIBE`/`UNSUBSCRIBE` e as mensagens chegando.

---

## Stack e versões

| Categoria | Tecnologia | Versão |
| --- | --- | --- |
| Linguagem | TypeScript | 6.0 |
| UI | React | 19.2 |
| Build | Vite | 8.2 |
| Rotas | React Router | 7.18 |
| Estilo | Tailwind CSS | 4.3 |
| Tempo real | WebSocket nativo | — |
| Qualidade | oxlint | 1.78 |

As versões exatas estão no `package.json`.

---

## Estrutura do projeto

```
src/
  components/
    layout/
    ConnectionStatusBadge.tsx
    EchoConsole.tsx
    IntervalSelector.tsx
    KlineTable.tsx
    PriceTickerCard.tsx
    SymbolSelector.tsx
    TradeFeedList.tsx
  hooks/
    useBinanceKlines.ts
    useBinanceTicker.ts
    useBinanceTrades.ts
    useEchoSocket.ts
    useWebSocketStream.ts
  pages/
    Dashboard/
    Echo/
    Klines/
    NotFound/
    TradeFeed/
  router/
    AppRouter.tsx
    routes.tsx
  services/
    websocket/
      WebSocketClient.ts
      binanceSocket.ts
  types/
    binance.ts
  utils/
    formatters.ts
  endpoints.ts
  App.tsx
  main.tsx
```

---

## Primeiros passos

### Pré-requisitos

- Node.js 20.19 ou mais recente
- npm

### Instalação

```bash
git clone https://github.com/marcospsdev/websocket-lab.git
cd websocket-lab
npm install
npm run dev               # http://localhost:5173
```

Não precisa de `.env`, chave de API nem backend próprio: o app conecta direto em `wss://stream.binance.com:9443/stream`.

---

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento (Vite) |
| `npm run build` | Typecheck (`tsc -b`) e build de produção em `dist/` |
| `npm run lint` | Analisa o código com o oxlint |
| `npm run preview` | Serve o build de produção localmente |

---

## Autor

**Marcos Paulo** · Desenvolvedor Full-Stack

- LinkedIn: [in/marcospsdev](https://www.linkedin.com/in/marcospsdev)
- GitHub: [@marcospsdev](https://github.com/marcospsdev)
