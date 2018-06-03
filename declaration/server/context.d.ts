export declare type ContextPlugin = {
    envKeys: string[];
    envContext: () => any;
};
export declare const defaultPlugins: {
    mailgun: {
        envKeys: string[];
        envContext(): {
            mailgun: {
                from: string | undefined;
                domain: string | undefined;
                apiKey: string | undefined;
            };
        };
    };
    sql: {
        envKeys: string[];
        envContext(): {
            database: {
                name: string;
                user: string;
                password: string;
            };
        };
    };
};
export default function (i: {
    requiredKeys?: string[];
    projectRoot: string;
    customContext?: () => Nextpress.CustomContext;
    plugins?: ContextPlugin[];
}): Nextpress.Context;
declare global {
    namespace Nextpress {
        interface DefaultContext {
            projectRoot: string;
            database?: {
                name: string;
                user: string;
                password: string;
            };
            mailgun?: {
                from: string;
                domain: string;
                apiKey: string;
            };
            website: {
                root: string;
                port: number;
                sessionSecret: string;
            };
        }
        interface CustomContext {
        }
        interface Context extends DefaultContext, CustomContext {
        }
    }
}
