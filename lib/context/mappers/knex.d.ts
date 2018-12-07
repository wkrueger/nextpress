import knex = require("knex");
export declare const knexContext: {
    id: string;
    envKeys: string[];
    optionalKeys: string[];
    envContext({ getKey }: {
        getKey: (s: string) => string | undefined;
    }): {
        database: {
            client: string;
            host: string;
            name: string;
            user: string;
            password: string;
            _currentFwVersion: number;
            _oldFwVersion: number;
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
        interface CustomContext extends ReturnType<typeof knexContext["envContext"]> {
        }
    }
    namespace Express {
        interface Request {
            transaction?: knex;
        }
    }
}
