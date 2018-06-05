export declare type ContextMapper = {
    envKeys: string[];
    optionalKeys: string[];
    envContext: () => any;
};
export declare const defaultMappers: {
    mailgun: {
        envKeys: string[];
        optionalKeys: string[];
        envContext(): {
            mailgun: {
                from: string | undefined;
                domain: string | undefined;
                apiKey: string | undefined;
            };
        };
    };
    database: {
        envKeys: string[];
        optionalKeys: string[];
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
    projectRoot: string;
    mappers: ContextMapper[];
}): Nextpress.Context;
declare global  {
    namespace Nextpress {
        interface DefaultContext {
            projectRoot: string;
            database: {
                name: string;
                user: string;
                password: string;
            };
            mailgun: {
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
