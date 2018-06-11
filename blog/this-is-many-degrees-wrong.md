# Autenticação e dados de servidor numa aplicação next.js

## O que o next.js sugere

O next (e até o create-react-app) sugerem que sua API e seu site estejam em sevidores/aplicações independentes.

## Páginas fechadas em uma arquitetura next.js/SPA

Como a autenticação fica inteiramente por conta do servidor de API, ao se carregar uma página o cliente requisita ao servidor de API a autenticação (ou dados que pedem autenticação), se algo de autenticação falhar o cliente redireciona para uma página de login.

**interação com o `getInitialProps`**

Pra que uma página seja interamente carregada via SSR, uma etapa de obtenção de dados prévios deveria ser colocada no `getInitialProps`, que exige código isomórfico (ou alguns IFs).

Independentemente do método de autenticação, o cliente estará armazenando uma peça de estado pra manter a autenticação (um ID de sessão ou um token JSON), peça essa que o servidor de páginas não terá acesso direto. O cliente vai ter que passar esse estado de alguma forma pro servidor, pra que ele possa autenticar.

- No caso de um JWT, o servidor não tem o acesso à local storage do cliente
- No caso de um session, a requisição feita pelo servidor de página não herda os cookies do cliente

**Solução sugerida:** Quando rodando no lado do servidor, `getInitialProps` recebe  no argumento `ctx.req` a requisição do cliente pra renderizar a página, ela possui os cookies necessários pra autenticar a seção, poderíamos fazer um método de requisição que ao identificar que estamos rodando no lado servidor, repasse esses cookies. E pra JWT? Vou pensar outro dia, mas seguiria em linhas similares...

```typescript
export async function isoRequest(ctx: any, req: Request) {
  return fetch(url(req.url, req.query), {
    method: req.method || "POST",
    body: req.body ? JSON.stringify(req.body) : undefined,
    headers: {
      "Content-Type": "application/json",
      cookie:
        ctx && ctx.req
          ? ctx.req.headers.cookie
          : typeof document !== "undefined" && document.cookie
    }
  })
}
```

## Optra opção: "Chumbando" os dados de servidor

No caso da nossa gambiarrenta "framework", uma forma de já trazer os dados no SSR seria invocar o método `render` do next.js lado servidor com o último parâmetro "query", este é serializado e vai parar no componente no lado client-side.

```typescript
      router.get(
        "/dashboard",
        authGuard,
        setup.tryMw(async (req, res) => {
          return setup.nextApp.render(req, res, "/dashboard", { dataGoesHere })
        })
      )
```

```typescript
export default (ctx: { query: { DataGoesHere: any } }) => <div/>
```

Caso se queira adicionar algo diferente do `query`, dá pra usar o mesmo esquema de ler do objeto de requisição. (warning: ugly code ahead)

```typescript
// pages/_app.tsx

export default class MyApp extends App {
  static async getInitialProps({ Component, router, ctx }: any) {
    let pageProps: any = {}
    if (Component.getInitialProps) {
      pageProps = (await Component.getInitialProps(ctx)) || {}
    }
    if (ctx.req) {
      pageProps.$user = ctx.req.session && ctx.req.session.user
      pageProps.data = ctx.req.data
    }
    return { pageProps }
  }
  
  render() {
    const { Component, pageProps, router } = this.props
    const inject = {
      ...pageProps,
      query: router.query
    }
    return (
      <Container>
        <Component {...inject} />
      </Container>
    )
  }    
    
}
```

Isto pode até ser OK se a aplicação não estiver se aproveitando do roteador do next, mas em geral é horrível pois vai dar pau quando o `getInitialProps` rodar no cliente...  Em suma: Não.

## Levar dados de sessão para o cliente de uma forma OK

Bom minha reação inicial é buscar uma forma com que minhas respostas de API que tenham autenticação também incluam os metadados de usuário (não estou a fim de fazer uma requisição extra em toda página só pra buscar esses dados, mas seria outra opção).

Como não costumo colocar `next()` em requisições completadas (nunca usei, nem sei se dá), alterar o corpo das respostas não parece legal de se conseguir. Uma outra idéia mais interessante que veio é: adicionar os dados de usuário em um cabeçalho HTTP de resposta, isto pode ser acrescentado no middleware de autenticação. Seems fine.

```typescript
const gatewayMw: RequestHandler = (req, res, next) => {
  try {
    if (!req.session) throw ono({ statusCode: 401 }, "Unauthorized")
    if (!req.session.user) throw ono({ statusCode: 401 }, "Unauthorized")
    res.setHeader("X-User-Id", req.session.user.id)
    res.setHeader("X-User-Email", req.session.user.email)
    next()
  } catch (err) {
    next(err)
  }
}
```

Como refinamento adicional, segui a seguinte idéia:

- Ofereço no callback do `getInitialProps` um wrapper ao método `fetch` recomendado.
- Esse wrapper acumula os dados de usuário das chamadas de API dentro do `geiInitialProps`
- Uma chave `user` é sempre adicionada além da resposta fornecida, com os dados de sessão obtidos.

```typescript
// pages._app.tsx
export default class MyApp extends App {
  static async getInitialProps({ Component, router, ctx }: any) {
    let pageProps: any = {}
    let _ctx: any = ctx || {}
    const isoreq = isoRequest(ctx)
    _ctx.fetcher = isoreq.fetch
    if (Component.getInitialProps) {
      pageProps = (await Component.getInitialProps(_ctx)) || {}
    }
    pageProps.user = isoreq.userInfo()
    return { pageProps }
  }
  //...
}

// isorequest.ts
export function isoRequest(ctx: any) {
  let _userInfo: { id: number; email: string } | undefined

  return {
    async fetch(req: Request) {
      let out = await fetch(url(req.url, req.query), {
        method: req.method || "POST",
        body: req.body ? JSON.stringify(req.body) : undefined,
        headers: {
          "Content-Type": "application/json",
          cookie:
            ctx && ctx.req
              ? ctx.req.headers.cookie
              : typeof document !== "undefined" && document.cookie
        }
      })
      if (out.headers.has("x-user-id")) {
        _userInfo = {
          id: Number(out.headers.get("x-user-id")),
          email: out.headers.get("x-user-email")!
        }
      }
      return out
    },

    userInfo() {
      return _userInfo
    }
  }
}
    
// pages/dashboard.tsx
class Root extends React.Component<{
  user: { email: string; id: number }
  rules: any[]
}> {
  static async getInitialProps({ fetcher }: any) {
    let resp = await fetcher({ url: "/api/rule/list" })
    if (!resp.ok) throw Error() //fixme - o que fazer aqui?
    let json = await resp.json()
    return { rules: json }
  }
  //...
}
```

## Conclusão

Conclusão? A conclusão essa bagaça dá trabalho...

