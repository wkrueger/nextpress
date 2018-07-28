import knex = require("knex");
import redis = require("ioredis");
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
    knex: {
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
    redis: {
        id: string;
        optionalKeys: string[];
        envContext(): {
            redis: {
                instance: () => redis.Redis;
            };
        };
    };
};
type GetMapperContext<T> = T extends {
    envContext: () => infer R;
} ? R : never;
type Values<T> = T[keyof T];
type Intersection = GetMapperContext<Values<typeof defaultMappers>>;
type GetKeys<U> = U extends Record<infer K, any> ? K : never;
type UnionToIntersection<U extends object> = {
    [K in GetKeys<U>]: U extends Record<K, infer T> ? T : never;
};
type GenDefaultContext = UnionToIntersection<Intersection>;
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
