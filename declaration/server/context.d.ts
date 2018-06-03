export declare type ContextPlugin = {
    envKeys: string;
    envContext: <T>() => T;
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
};
export default function (i: {
    requiredKeys?: string[];
    projectRoot: string;
    customContext?: () => Nextpress.CustomContext;
    plugins?: ContextPlugin[];
}): Promise<Nextpress.Context>;
declare global {
    namespace Nextpress {
        interface DefaultContext {
            projectRoot: string;
            database: {
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
