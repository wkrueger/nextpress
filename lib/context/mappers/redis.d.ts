export declare const redisContext: {
    id: string;
    envKeys: never[];
    optionalKeys: string[];
    envContext({ getKey }: {
        getKey: (s: string) => string | undefined;
    }): {
        redis: {
            instance: () => any;
        };
    };
};
declare global {
    namespace Nextpress {
        interface CustomContext extends ReturnType<typeof redisContext["envContext"]> {
        }
    }
}
