# Arquitetura — websocket-lab

Este documento existe pra você (o dev) revisitar depois e entender **por que** cada peça foi
desenhada do jeito que foi — não é um tutorial de "como usar WebSocket", é o raciocínio por trás
das decisões estruturais, pensado especificamente pra você comparar com o padrão REST comum
num app React tradicional.

## Objetivo do projeto

Ter uma base pequena, mas **arquiteturalmente séria**, de como organizar uma feature de dados em
tempo real via WebSocket num app React — usando a API pública da Binance (sem autenticação, sem
custo) como fonte de dados real.

## Visão geral do fluxo de dados

```
Binance (wss://stream.binance.com:9443/stream)
        │  mensagens JSON, sempre no formato { stream, data }
        ▼
WebSocketClient            (services/websocket/WebSocketClient.ts)
        │  conecta, reconecta com backoff, expõe onMessage/onStatusChange
        ▼
binanceSocket               (services/websocket/binanceSocket.ts)
        │  UMA conexão física só; multiplexa N streams por cima dela
        │  roteia cada mensagem pros handlers certos, pelo campo "stream"
        ▼
useWebSocketStream          (hooks/useWebSocketStream.ts)
        │  hook genérico: assina 1 stream, guarda a última mensagem em state
        ▼
useBinanceTicker / useBinanceTrades / useBinanceKlines   (hooks/useBinance*.ts)
        │  hooks de domínio: sabem o nome do stream, normalizam o payload cru
        ▼
Componentes (PriceTickerCard, TradeFeedList, KlineTable, ...)
        │  só recebem dado já normalizado e tipado — nunca veem "c", "s", "q" cru da Binance
        ▼
Páginas (Dashboard, TradeFeed, Klines)
```

Cada seta é uma fronteira de responsabilidade clara. Isso é o mesmo princípio de camadas que o
um app React típico usa pro REST — só que trocando "requisição pontual" por "assinatura
contínua".

## Comparação lado a lado com o padrão REST de um app React típico

| Camada REST (app de referência)                                    | Camada WS (`websocket-lab`)                                         | Papel                                                             |
| -------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `endpoints.ts` — array `{name, route, method}`                       | `endpoints.ts` — array `{name, template, description}`                | Registro central: nomes lógicos → como falar com o servidor        |
| `utils/httpClient.ts` — instância única do axios + interceptors      | `services/websocket/WebSocketClient.ts` — classe reconectável genérica | "Motor" de transporte, não sabe nada de domínio                    |
| `services/authService.ts` — funções que usam `httpClient`            | `services/websocket/binanceSocket.ts` — singleton que usa `WebSocketClient` | Camada de domínio: sabe o protocolo específico do servidor (aqui, SUBSCRIBE/UNSUBSCRIBE da Binance) |
| `hooks/useApi.ts` — `{data, loading, error, makeRequest}`            | `hooks/useWebSocketStream.ts` — `{data, status, messageCount}`         | Ponte genérica entre a camada de serviço e o React                 |
| Um hook de domínio por tela, chamando `useApi(algumServiceFn)`       | Um hook de domínio por stream, chamando `useWebSocketStream(streamName)` | Especialização: nomeia o dado, tipa o retorno                      |
| `router/*.tsx` — array de rotas `{path, element, title}`             | `router/routes.tsx` — mesmíssimo formato                               | Fonte única de verdade das rotas, usada pra montar nav e `<Routes>` |

A diferença estrutural real entre REST e WS não está na organização de pastas — é praticamente a
mesma. Está em **duas coisas**:

1. **HTTP é "pergunta → resposta única"; WebSocket é "assina → vários eventos ao longo do tempo".**
   Por isso `useApi` devolve uma função (`makeRequest`) que você chama quando quer, enquanto
   `useWebSocketStream` já começa a "encher" o `data` sozinho assim que o componente monta, e para
   quando desmonta.
2. **HTTP não tem estado de conexão pra gerenciar; WebSocket tem.** É pra isso que existe o
   `ConnectionStatus` (`idle | connecting | open | reconnecting | closed`) e a reconexão automática
   com backoff exponencial — não tem equivalente disso no mundo REST simples.

## Por que existem DUAS camadas de client (`WebSocketClient` + `binanceSocket`) em vez de uma só

Essa é a decisão mais importante do projeto pra entender.

- **`WebSocketClient`** não sabe o que é Binance. Ele só sabe abrir um `new WebSocket(url)`,
  reconectar quando cai (com backoff exponencial: 1s, 2s, 4s, 8s... até um teto de 30s), e chamar
  um callback pra cada mensagem JSON recebida. Dá pra reusar ele pra QUALQUER servidor WS — troca
  a URL e pronto.
- **`binanceSocket`** é onde mora o conhecimento específico da Binance: o fato de que ela usa um
  endpoint combinado (`/stream?streams=...`), que aceita `{"method":"SUBSCRIBE","params":[...]}`
  pra adicionar streams depois de já conectado, e que toda mensagem chega embrulhada em
  `{stream, data}`.

Isso espelha exatamente a separação `httpClient.ts` (genérico, axios puro) vs `authService.ts`
(sabe as rotas específicas da API) num app REST típico.

## O pulo do gato: uma conexão física, N assinaturas lógicas

Uma armadilha comum em apps React com WebSocket é abrir uma conexão nova pra cada componente que
precisa de dado ao vivo — se você tiver 4 cards de preço na tela (`Dashboard`), isso viraria 4
conexões WebSocket simultâneas pro mesmo servidor. Funciona, mas é desperdício, e a maioria dos
servidores (Binance inclusa) tem limite de conexões simultâneas por IP.

`binanceSocket` resolve isso com **contagem de referências** (`handlersByStream`, um
`Map<streamName, Set<handler>>`):

- O 1º componente que assina `"btcusdt@ticker"` dispara um `SUBSCRIBE` de verdade pro servidor (ou
  abre a conexão, se for a primeira assinatura de todas).
- Um 2º componente assinando o MESMO stream só entra no `Set` de handlers — nenhum `SUBSCRIBE`
  novo é enviado, a Binance nem fica sabendo que teve um segundo interessado.
- Quando o último handler de um stream desiste (componente desmontou), aí sim vai um
  `UNSUBSCRIBE`.
- Quando não sobra NENHUM stream ativo, a conexão física fecha sozinha — mas só depois de um
  **período de graça de 300ms** (ver seção "Bug real encontrado" logo abaixo), não instantaneamente.

Teste isso na prática: abra a aba **Dashboard** (4 cards, 4 streams de ticker) com o DevTools →
Network → WS aberto. Você vai ver **uma única conexão**, e 4 frames de `SUBSCRIBE` saindo nela.

## Reconexão automática

Se a conexão cair (rede oscilou, servidor reiniciou, etc.), `WebSocketClient` tenta reconectar
sozinho com backoff exponencial. Quando reconecta, `binanceSocket` reenvia `SUBSCRIBE` pra TODOS os
streams que ainda tinham handler ativo (`resubscribeAll`) — porque o servidor esquece suas
assinaturas antigas assim que a conexão cai, mesmo que seja o "mesmo" client reconectando.

Esse é um detalhe fácil de esquecer: sem o `resubscribeAll`, depois de uma queda de rede a tela
ficaria "viva" (status `open`) mas muda, sem nenhum dado chegando.

## Bug real encontrado: badge mostrando "Disconnected" com dado chegando normal

Sintoma reportado: o badge de conexão às vezes piscava pra "Disconnected" sozinho, mesmo com os
preços continuando a atualizar na tela — ou seja, **o dado nunca parava de chegar**, só o
indicador de status mentia. No console apareciam 3 mensagens em sequência: um `UNSUBSCRIBE`
descartado ("tried to send while not connected"), um erro nativo do navegador
("WebSocket is closed before the connection is established") e um "[WebSocketClient] socket
error".

**Causa raiz**: toda vez que `handlersByStream` esvaziava (última assinatura da tela saindo — ex.:
trocar de página, trocar de símbolo, ou o duplo-mount do StrictMode em dev) e um novo `subscribe`
chegava logo em seguida, o fluxo era: fecha a conexão física → cria uma nova. O problema é que
`openConnection` registrava o listener de status assim: `this.statusListeners.forEach(...)` **sem
checar se aquele client específico ainda era o ativo**. Quando a conexão VELHA (já substituída pela
nova) finalmente terminava seu handshake de fechamento — de forma assíncrona, podendo chegar
DEPOIS da nova conexão já estar `open` — o evento `closed` dela ainda disparava e sobrescrevia o
status global, mesmo a conexão nova estando saudável.

**Fix, duas partes**:

1. **Guarda de identidade** — `openConnection` agora captura a instância do client num `const
   client = ...` local e checa `if (this.client !== client) return` dentro do listener de status.
   Qualquer evento tardio vindo de um client que já foi substituído é simplesmente ignorado.
2. **Período de graça de 300ms antes de fechar** — em vez de fechar a conexão física
   IMEDIATAMENTE quando o último stream é removido, `unsubscribe` agenda o fechamento com
   `setTimeout`. Se um `subscribe` novo chegar antes disso (exatamente o caso de trocar de
   página/símbolo rápido, ou o StrictMode remontando), o timer é cancelado e a conexão existente é
   reaproveitada — nem chega a fechar de verdade. Isso ataca a causa, não só o sintoma: menos
   aberturas/fechamentos de socket = menos chance da race acontecer.

Como bônus, `WebSocketClient` também parou de logar `socket error` quando o fechamento foi
deliberado (`manuallyClosed`) — abortar um socket ainda no meio do handshake é um comportamento
esperado do navegador, não uma falha real.

**Lição pra guardar**: em qualquer client que recria sua conexão ao longo do tempo (não só
WebSocket — vale pra `EventSource`, `IntersectionObserver` reencadeado, etc.), nunca assuma que um
callback registrado numa instância antiga vai parar de disparar só porque você criou uma instância
nova. Ou você desregistra o listener antigo explicitamente, ou — como aqui — guarda uma referência
e checa identidade antes de agir.

## Por que `useBinanceTrades`/`useBinanceKlines` não usam `useWebSocketStream`

`useWebSocketStream` guarda só a **última** mensagem recebida (`data`). Isso é perfeito pro
ticker (só importa o preço atual). Mas um feed de trades ou uma tabela de candles precisa de um
**histórico rolante** das últimas N mensagens — então esses dois hooks assinam
`binanceSocket` diretamente e acumulam num array (`setTrades(prev => [novo, ...prev].slice(0, N))`),
em vez de delegar pro hook genérico. É uma escolha consciente: nem todo hook de domínio precisa
usar o hook genérico por baixo, quando o padrão de acumulação de dado é diferente.

## Klines: por que "upsert" em vez de "append"

A Binance manda um evento de kline a CADA trade novo enquanto a vela do minuto/hora ainda está
"se formando" (`k.x: false`), e só marca `k.x: true` quando ela fecha. Ou seja, um único candle de
1 minuto pode gerar dezenas de mensagens antes de fechar. `useBinanceKlines` usa o `openTime` da
vela como chave — se já existe uma vela com esse `openTime` na lista, ela é substituída, não
duplicada. Repare no badge "forming…"/"closed" na tela de Klines: é literalmente o campo `k.x` cru
te contando se aquela linha ainda vai mudar de valor no próximo evento.

## Caveat de desenvolvimento: React StrictMode

Em dev, o `<StrictMode>` do React monta, desmonta e remonta cada componente uma vez de propósito
(pra pegar bugs de efeito colateral). Isso significa que ao abrir uma tela, `binanceSocket` recebe
um `subscribe` → `unsubscribe` → `subscribe` de novo, tudo em milissegundos. Não é bug — é o
StrictMode expondo exatamente o cenário que o período de graça de 300ms (seção "Bug real
encontrado" acima) foi desenhado pra aguentar sem precisar fechar/reabrir a conexão de verdade.
Antes desse fix, dava pra ver isso na aba Network como `SUBSCRIBE` → `UNSUBSCRIBE` →
`SUBSCRIBE` de novo; agora o `UNSUBSCRIBE` nem chega a sair, porque o remount do StrictMode
acontece bem dentro da janela de graça. Em produção (`npm run build` + `npm run preview`) o
StrictMode nem existe, então isso não acontece de jeito nenhum lá.

## Estrutura de pastas

```
src/
├── endpoints.ts                    # registro de streams (equivalente ao endpoints.ts REST)
├── types/binance.ts                # tipos crus da Binance + tipos normalizados + funções normalize*
├── utils/formatters.ts             # formatação de preço/quantidade/hora pra UI
├── services/websocket/
│   ├── WebSocketClient.ts          # client genérico reconectável (não sabe o que é Binance)
│   ├── binanceSocket.ts            # singleton específico da Binance (multiplexação + protocolo)
│   └── index.ts
├── hooks/
│   ├── useWebSocketStream.ts       # hook genérico (1 stream → última mensagem)
│   ├── useBinanceTicker.ts         # hook de domínio
│   ├── useBinanceTrades.ts         # hook de domínio (mantém lista rolante)
│   ├── useBinanceKlines.ts         # hook de domínio (mantém lista rolante + upsert por openTime)
│   └── index.ts
├── components/                     # peças de UI puras, recebem dado já normalizado via props
├── pages/                          # uma pasta por rota, monta hooks + componentes
├── router/
│   ├── routes.tsx                  # fonte única de verdade das rotas
│   └── AppRouter.tsx               # monta o <Routes> a partir de routes.tsx
├── App.tsx
└── main.tsx
```

## Como adicionar um novo stream (passo a passo)

Exemplo: adicionar o stream de order book (`<symbol>@depth5@100ms`).

1. **`endpoints.ts`** — adicionar o `WsStreamKind` e a entrada no array `wsEndpoints`, com o
   `template` certo.
2. **`types/binance.ts`** — adicionar o tipo `RawDepthEvent` (payload cru) e um tipo normalizado
   (`OrderBookLevel[]`, por exemplo) + a função `normalizeDepth`.
3. **`hooks/useBinanceDepth.ts`** — novo hook de domínio. Se só importa o estado mais recente,
   pode usar `useWebSocketStream` por baixo, igual `useBinanceTicker`. Se precisa acumular
   histórico, siga o padrão de `useBinanceTrades`.
4. **`components/`** — componente de UI que recebe o dado normalizado via props.
5. **`pages/`** — nova página ou seção numa página existente, chamando o hook.
6. Se for uma rota nova: adicionar em `router/routes.tsx` — a nav do `AppLayout` atualiza sozinha
   (ela itera `routes` automaticamente).

Nenhuma dessas camadas precisa saber da existência das outras além da imediatamente abaixo —
`binanceSocket` não sabe que existe React, `useWebSocketStream` não sabe que existe Binance, os
componentes não sabem que existe WebSocket nenhum.

## O que foi deixado de fora de propósito

- **Sem autenticação** — a Binance não exige nada pra esses streams de mercado; não tem
  equivalente ao token/refresh-token de um `httpClient.ts` REST aqui.
- **Sem REST** — dá pra combinar REST (pra estado inicial/histórico) + WS (pra atualização ao
  vivo) numa app real, mas esse projeto é focado só na parte WS de propósito.
- **Sem gráfico de candles de verdade** — a tela de Klines é uma tabela, não um chart. Focar na
  mecânica de dado chegando em tempo real, não em visualização.
