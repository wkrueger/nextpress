export declare type ContextMapper = {
    id: string;
    envKeys: string[];
    optionalKeys: string[];
    envContext: (i: {
        getKey: (s: string) => string | undefined;
    }) => any;
};
export declare const createContextMapper: <R extends ContextMapper>(i: R) => R;
export declare function ContextFactory(i: {
    withPrefix?: string;
    projectRoot: string;
    mappers: ContextMapper[];
}): Nextpress.Context;
declare global {
    namespace Nextpress {
        interface DefaultContext {
            projectRoot: string;
            pathFromRoot: (...i: string[]) => string;
            loadedContexts: Set<string>;
            requireContext: (...contextIds: string[]) => void;
        }
        interface CustomContext {
        }
        interface Context extends DefaultContext, CustomContext {
        }
    }
}
