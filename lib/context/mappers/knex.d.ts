import knex = require("knex");
export interface Migration {
    version: number;
    upgrade: (trx: knex.Transaction) => Promise<void>;
    downgrade: (trx: knex.Transaction) => Promise<void>;
}
export declare const customKnexContext: (extraOpts?: knex.Config) => {
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
                migrations?: Migration[] | undefined;
            }): Promise<void>;
            db(): knex;
            _checkMigrationVersions(migrations: Migration[]): void;
        };
    };
};
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
                migrations?: Migration[] | undefined;
            }): Promise<void>;
            db(): knex;
            _checkMigrationVersions(migrations: Migration[]): void;
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
