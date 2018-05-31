import * as server from "./declaration/index"
import * as client from "./declaration/client"

declare module "nextpress" {
  export = server
}

declare module "nextpress/client" {
  export = client
}
