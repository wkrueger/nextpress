"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class CRUD {
    constructor(ctx, opts) {
        this.ctx = ctx;
        this.opts = opts;
        this.tableName = this.opts.tableName;
        this.fieldDefs = this.opts.fieldDefs;
        this.indexDefs = this.opts.indexDefs;
        this.db = this.ctx.database.db();
        ctx.requireContext("default.knex");
    }
    async createTable() {
        this.db.schema.createTableIfNotExists(this.tableName, table => {
            table.increments();
            for (let x = 0; x < this.fieldDefs.length; x++) {
                const field = this.fieldDefs[x];
                switch (field.of.type) {
                    case "varchar":
                        let f = table.string(field.name, field.of.size);
                        f = setNullability(f, field);
                        continue;
                    default:
                        throw Error("not implemented " + field.of.type);
                }
            }
        });
    }
}
function setNullability(f, field) {
    f =
        field.nullable === undefined ? f.notNullable() : field.nullable ? f.nullable() : f.notNullable();
    return f;
}
//# sourceMappingURL=index.js.map