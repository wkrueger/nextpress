import knex = require("knex");
export declare const context: {
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
declare global {
    namespace Nextpress {
        interface CustomContext extends ReturnType<typeof context["envContext"]> {
        }
    }
}
