import knex = require("knex");
export declare type ContextMapper = {
    id: string;
    envKeys: string[];
    optionalKeys: string[];
    envContext: () => any;
};
export declare const defaultMappers: {
    mailgun: {
        id: string;
        envKeys: string[];
        optionalKeys: string[];
        envContext(): {
            mailgun: {
                from: string;
                domain: string;
                apiKey: string;
                sendMail(inp: {
                    email: string;
                    subject: string;
                    html: string;
                }): Promise<any>;
            };
        };
    };
    database: {
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
    website: {
        id: string;
        envKeys: string[];
        optionalKeys: string[];
        envContext(): {
            website: {
                root: string;
                port: number;
                sessionSecret: string;
                logRequests: boolean;
                bundleAnalyzer: boolean;
            };
        };
    };
};
declare type GetMapperContext<T> = T extends {
    envContext: () => infer R;
} ? R : never;
declare type Values<T> = T[keyof T];
declare type Intersecion = GetMapperContext<Values<typeof defaultMappers>>;
declare type GetKeys<U> = U extends Record<infer K, any> ? K : never;
declare type UnionToIntersection<U extends object> = {
    [K in GetKeys<U>]: U extends Record<K, infer T> ? T : never;
};
declare type GenDefaultContext = UnionToIntersection<Intersecion>;
export default function (i: {
    projectRoot: string;
    mappers: ContextMapper[];
}): Nextpress.Context;
declare global {
    namespace Nextpress {
        interface DefaultContext extends GenDefaultContext {
            projectRoot: string;
            loadedContexts: Set<string>;
            requireContext: (...contextIds: string[]) => void;
        }
        interface CustomContext {
        }
        interface Context extends DefaultContext, CustomContext {
        }
    }
}
export {};
