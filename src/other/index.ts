import { Field, IndexDef } from "./ddl-help"
import knex = require("knex")

class CRUD {
  constructor(
    private ctx: Nextpress.Context,
    private opts: { tableName: string; fieldDefs: Field[]; indexDefs: IndexDef[] }
  ) {
    ctx.requireContext("default.knex")
  }

  tableName = this.opts.tableName
  fieldDefs = this.opts.fieldDefs
  indexDefs = this.opts.indexDefs
  db = this.ctx.database.db()

  async createTable() {
    this.db.schema.createTableIfNotExists(this.tableName, table => {
      table.increments()
      for (let x = 0; x < this.fieldDefs.length; x++) {
        const field = this.fieldDefs[x]
        switch (field.of.type) {
          case "varchar":
            let f = table.string(field.name, field.of.size)
            f = setNullability(f, field)
            continue
          default:
            throw Error("not implemented " + field.of.type)
        }
      }
    })
  }
}

function setNullability(f: knex.ColumnBuilder, field: Field) {
  f =
    field.nullable === undefined ? f.notNullable() : field.nullable ? f.nullable() : f.notNullable()
  return f
}
