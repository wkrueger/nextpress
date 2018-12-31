import { Server } from "../lib/server"
import { ContextFactory } from "../lib/context"
import { websiteContext } from "../lib/context/mappers/website"
import { jwtContext } from "../lib/context/mappers/jwt"
import path = require("path")
import fetch = require("isomorphic-fetch")
const ROOT = "http://localhost:5555"

function createServer(ServerClass = Server) {
  let context = ContextFactory({
    projectRoot: path.resolve(__dirname),
    mappers: [websiteContext, jwtContext]
  })
  let server = new ServerClass(context)
  server.options.useNextjs = false
  return server
}

class Custom extends Server {
  async setupRoutes() {
    this.fastify.get("/create-token", async req => {
      let token = await req.nextpressAuth.setUser({ id: 5, email: "myuser" })
      return { token }
    })
    this.fastify.get("/read-token", async req => {
      let user = await req.nextpressAuth.getUser()
      return { user }
    })

    this.fastify.get("/fail", async () => {
      throw Error("Fail fast.")
    })
  }
}

let customServer: Custom

test("Simple create server", async () => {
  let server = createServer()
  await server.run()
  await server.fastify.server.close()
})

let token = ""

test("Save JWT", async () => {
  customServer = createServer(Custom)
  await customServer.run()
  let resp = await fetch(ROOT + "/create-token")
  let json = await resp.json()
  expect(json).toHaveProperty("token")
  token = json.token
})

test("Read token", async () => {
  let resp = await fetch(ROOT + "/read-token", { headers: { authorization: `Bearer ${token}` } })
  let json = await resp.json()
  delete json.user.exp
  delete json.user.iat
  expect(json).toEqual({ user: { id: 5, email: "myuser" } })
})

test("error format", async () => {
  let resp = await fetch(ROOT + "/fail")
  let json = await resp.json()
  expect(json).toHaveProperty("error")
  expect(json.error).toEqual({ message: "Fail fast." })
})
