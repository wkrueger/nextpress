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
};
export default function <Plugin extends ContextPlugin>(i: {
    requiredKeys?: string[];
    projectRoot: string;
    customContext?: () => Nextpress.CustomContext;
    plugins?: Plugin[];
}): Nextpress.Context;
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
