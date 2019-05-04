import knexMod = require("knex")

export const ddlHelp = <Schema extends Field[]>(i: Schema) => i

export type Field = {
  name: string
  of: Types
  nullable?: boolean //default false
  default?: string | number | Raw | AutoIncrement
}

enum Raw {}
enum AutoIncrement {
  get = Symbol() as any
}

export type Types = NumberTypes | DateTypes | StringTypes

type NumberTypes =
  | {
      type: "tinyint" | "boolean" | "smallint" | "mediumint" | "int" | "bigint"
      unsigned?: boolean //default false
      zerofill?: boolean
      precision?: number
    }
  | {
      type: "decimal" | "float" | "double"
      unsigned?: boolean //default true
      precision?: number
      decimals?: number
    }
  | {
      // SERIAL is an alias for BIGINT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE.
      type: "serial"
    }

type DateTypes =
  | {
      type: "date" | "timestamp" | "time"
      fractionalSecondsPrecision?: number //0 to 6
    }
  | { type: "year" }

type StringTypes =
  | {
      type: "char" | "varchar"
      national?: boolean
      size?: number
      charset?: string
      collate?: string
    }
  | { type: "binary" | "varbinary" | "blob"; size?: number }
  | { type: "tinyblob" | "mediumblob" | "longblob" }
  | { type: "tinytext" | "text" | "mediumtext" | "longtext"; charset?: string; collate?: string }
  | {
      type: "enum" | "set"
      options: string[]
      charset?: string
      collate?: string
    }

export type IndexDef = {
  name: string
  columns: string[]
  unique?: boolean
  algorithm?: string
}
