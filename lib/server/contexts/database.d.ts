import knex = require("knex");
declare const _default: {
    id: string;
    envKeys: string[];
    optionalKeys: string[];
    envContext(): {
        database: {
            client: string;
            host: string;
            name: string;
            user: string;
            password: string;
            _db: knex;
            init(opts: {
                currentVersion: number;
                migration: (trx: knex.Transaction, oldVersion: number, newVersion: number) => Promise<void>;
            }): Promise<void>;
            db(): knex;
        };
    };
};
export default _default;
