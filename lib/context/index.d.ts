export declare type ContextMapper = {
    id: string;
    envKeys: string[];
    optionalKeys: string[];
    envContext: () => any;
};
export declare const validateContextType: <R extends ContextMapper>(i: R) => R;
export declare function defaultMappers(...names: ("knex" | "mailgun" | "redis" | "website")[]): ContextMapper[];
export declare function ContextFactory(i: {
    projectRoot: string;
    mappers: ContextMapper[];
}): Nextpress.Context;
declare global {
    namespace Nextpress {
        interface DefaultContext {
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
