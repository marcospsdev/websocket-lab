# WebSocket vs HTTP — como enviar dados, e por que não tem "verbo"

Notas de estudo sobre uma dúvida comum pra quem vem do mundo REST/axios: WebSocket é sempre um
`GET`? Onde entram `POST`/`PUT`/`DELETE`? Por que o Network tab mostra os frames enviados/recebidos
numa aba "Messages" em vez de linhas separadas como nas chamadas HTTP?

## WebSocket é sempre um `GET`?

Sim, e só um. A conexão WebSocket **nasce** como uma única requisição HTTP `GET` com headers
especiais (`Upgrade: websocket`, `Connection: Upgrade`, `Sec-WebSocket-Key`). O servidor responde
`101 Switching Protocols` em vez de `200`, e a partir daí o mesmo socket TCP **para de falar HTTP**
e passa a falar o protocolo WebSocket puro (RFC 6455).

É por isso que no Network tab você vê **uma linha só** pra `wss://ws.postman-echo.com/raw` (o
handshake) — e dentro dela, a aba **Messages**, listando os frames que passaram por cima dessa
única conexão já estabelecida. Não é um GET disfarçado dando updates — é literalmente outro
protocolo rodando no mesmo cano.

## Como a conexão deve ser fechada

Assim como abrir é um handshake (GET → 101), fechar também é um handshake — só que simétrico:
**qualquer um dos dois lados** pode iniciar o fechamento, não só o cliente. Ninguém "deixa a
conexão morrer" — existe um frame de close (opcode `0x8`) dedicado pra isso:

1. Um lado manda um frame de close, opcionalmente com um **código** (`code`) e um **motivo**
   (`reason`, texto curto, até 123 bytes).
2. O outro lado, ao receber, deve responder com o próprio frame de close (eco do handshake de
   abertura, mas pra fechar).
3. Só depois dessa troca o TCP por baixo é encerrado de verdade.

Do lado do browser, você não monta esse frame na mão — chama `socket.close(code?, reason?)` e o
navegador cuida do handshake. O evento que você recebe é `onclose`, com um `CloseEvent` que carrega:

- **`code`** — por que fechou. Os que mais aparecem na prática:
  - `1000` — fechamento normal, deliberado (o que `socket.close()` manda por padrão).
  - `1001` — "going away" (aba fechada, navegação pra outra página).
  - `1006` — **anormal**: a conexão caiu sem nenhum frame de close ter sido trocado (rede caiu,
    servidor derrubou o processo, etc.). É o código mais comum quando o "fechamento" não foi
    deliberado por ninguém.
  - `1011` — erro interno do servidor.
  - Códigos customizados de app ficam na faixa `3000–4999` (`1000–2999` são reservados pelo
    protocolo).
- **`reason`** — texto livre que o lado que fechou quis explicar.
- **`wasClean`** — `true` só quando o handshake de close completou direitinho; `false` inclui o
  caso `1006`.

### Duas situações bem diferentes que parecem a mesma coisa

Isso é o detalhe que costuma morder: **"a conexão fechou" pode significar duas coisas opostas**, e
o app precisa distinguir:

1. **Fechamento deliberado** — o próprio cliente decidiu que não precisa mais da conexão (usuário
   saiu da tela, trocou de página). Aqui você **não** quer reconectar.
2. **Fechamento inesperado** — rede oscilou, servidor caiu, o `1006` clássico. Aqui você **quer**
   reconectar (é pra isso que existe o backoff exponencial).

Neste projeto, `WebSocketClient` resolve isso com uma flag simples,
[`manuallyClosed`](src/services/websocket/WebSocketClient.ts):

```ts
disconnect() {
  this.manuallyClosed = true   // "eu que pedi pra fechar"
  if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
  this.socket?.close()
  this.socket = null
  this.setStatus('closed')
}
```

E o handler `onclose` verifica essa flag antes de decidir se reconecta ou não:

```ts
socket.onclose = () => {
  this.socket = null
  if (this.manuallyClosed) {
    this.setStatus('closed')   // fechamento pedido: para por aqui
    return
  }
  this.scheduleReconnect()     // fechamento inesperado: tenta de novo com backoff
}
```

A mesma flag também evita logar `socket error` quando o fechamento deliberado acontece no meio do
handshake de abertura — abortar um socket ainda conectando dispara `error`+`close` no navegador
como comportamento esperado, não uma falha de verdade.

### Fechar não é instantâneo — e nem sempre é a hora certa de fechar

`binanceSocket` fecha a conexão física só quando **nenhum stream tem handler ativo** (contagem de
referência) — e mesmo assim não fecha na hora: agenda o fechamento com 300ms de graça
(`unsubscribe` em [`binanceSocket.ts`](src/services/websocket/binanceSocket.ts)). Se um novo
`subscribe` chegar antes disso — troca rápida de tela/símbolo, ou o mount→unmount→remount do
StrictMode em dev — o timer é cancelado e a conexão nem chega a fechar. Detalhe completo, com o bug
real que motivou isso, em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

### Regra prática pra React

Toda conexão aberta num `useEffect` **precisa** ser fechada na função de cleanup desse mesmo
efeito — senão o componente desmonta e o socket continua vivo, recebendo mensagens que ninguém vai
mais ler (leak). É esse contrato que `useWebSocketStream` segue: o `subscribe()` devolve uma
função de unsubscribe, e o `return` do `useEffect` a chama.

## Por que não tem POST/PUT/DELETE nem "GET by id"?

Porque **o protocolo WebSocket não tem o conceito de método, rota ou status code por mensagem**.
Depois do handshake, o que existe é só: "aqui vai um frame de texto/binário" — em qualquer direção,
a qualquer momento. Sem verbo, sem path, sem header por mensagem. Isso explica o que se percebe na
prática: não tem "POST" no Network porque **não existe POST no WebSocket** — só existe no HTTP, e o
HTTP já saiu de cena depois do 101.

Então como um app faz "criar", "editar", "deletar", "buscar por id" numa conexão WS? **Isso é
responsabilidade da aplicação, não do protocolo.** Cliente e servidor combinam um formato de
mensagem próprio (um "mini-protocolo" inventado por quem fez o servidor), geralmente JSON com um
campo tipo `type`/`method`/`action`. Não existe padrão universal — cada serviço WS inventa o seu.
Dois estilos comuns:

- **Estilo JSON-RPC** (é o que a Binance usa neste projeto, em `binanceSocket.sendFrame`):

  ```json
  { "method": "SUBSCRIBE", "params": ["btcusdt@trade"], "id": 1 }
  ```

  Se a Binance permitisse "cancelar uma ordem" por WS, seria outro `method` inventado por ela, tipo
  `"CANCEL_ORDER"` — não existe um "DELETE" genérico.

- **Estilo evento/tipo** (comum em chat, jogos, editores colaborativos):

  ```json
  { "type": "DELETE_MESSAGE", "payload": { "id": 123 } }
  { "type": "EDIT_MESSAGE", "payload": { "id": 123, "text": "..." } }
  ```

O echo da Postman (`wss://ws.postman-echo.com/raw`, usado na página `/echo` deste projeto) não tem
protocolo nenhum — ele é o WS mais burro possível, só devolve os bytes que recebeu. Por isso lá não
aparece "verbo" nenhum: não tem, porque não tem aplicação nenhuma por trás, só um espelho.

**Padrão real de mercado**: a maioria dos apps *não* tenta recriar CRUD inteiro via WS — mantém
create/update/delete/get-by-id em REST (onde verbo, status code e idempotência já existem de
graça) e usa WebSocket só pro que HTTP não faz bem: push contínuo do servidor, ou raramente uma
ação disparada pelo cliente que já faz parte de um fluxo contínuo (mandar mensagem de chat, digitar
comando de jogo). Chat/jogos/trading engine são os casos que realmente constroem um protocolo
bidirecional completo por cima do WS.

## Bibliotecas ("qual é o axios do WebSocket")

A analogia quebra um pouco porque a API nativa `WebSocket` do browser já é trivial (`new
WebSocket(url)`, `.send()`, `.onmessage`) — não tem muito o que uma lib precisa embrulhar, ao
contrário do HTTP (headers, interceptors, base URL, retry). Por isso o `WebSocketClient.ts` deste
projeto tem ~120 linhas: reconexão com backoff é basicamente o único valor real que um wrapper
agrega.

- **[react-use-websocket](https://github.com/robtaussig/react-use-websocket)**
  ([npm](https://www.npmjs.com/package/react-use-websocket)) — hook em cima do `WebSocket` nativo,
  com reconexão, heartbeat, parsing de JSON. É a coisa mais próxima de "o axios do WS pra React".
- **[Socket.IO](https://socket.io/docs/v4/)** — cuidado, **não é WebSocket puro**. É um protocolo
  próprio por cima do WS (com fallback pra long-polling), com API baseada em eventos
  (`socket.emit`/`socket.on`), salas, namespaces. Exige um servidor Socket.IO do outro lado — não
  conecta num WS "cru" como a Binance ou o echo da Postman. Muito popular pra chat, mas é outro
  ecossistema, não "WebSocket + conveniência".
- **Nativo** (o que este projeto usa) — sem lib nenhuma, só a API do browser.

## Documentação oficial

- [WebSocket API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) e
  [WebSockets_API overview — MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [Writing WebSocket client applications — MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_client_applications)
- [WebSocket Handshake: HTTP Upgrade — websocket.org](https://websocket.org/reference/handshake/) e
  [WebSocket Protocol (RFC 6455) explicado — websocket.org](https://websocket.org/guides/websocket-protocol/) —
  esses dois cobrem o handshake/GET em detalhe
- [react-use-websocket](https://github.com/robtaussig/react-use-websocket)
- [Socket.IO docs](https://socket.io/docs/v4/)

## Ver na prática neste projeto

- `src/services/websocket/WebSocketClient.ts` — o "GET + upgrade" e o envio/recebimento de frames
  crus, sem saber nada de verbo ou domínio.
- `src/services/websocket/binanceSocket.ts` — o mini-protocolo JSON-RPC (`SUBSCRIBE`/`UNSUBSCRIBE`)
  que a Binance inventou por cima do WS puro.
- `src/pages/Echo/index.tsx` (`/echo`) — envio de mensagem pro echo público da Postman, pra ver os
  frames saindo e voltando na aba Messages do DevTools sem nenhum verbo HTTP envolvido.
