export declare const jwtContext: {
    id: string;
    envKeys: string[];
    optionalKeys: never[];
    envContext({ getKey }: {
        getKey: (s: string) => string | undefined;
    }): {
        jwt: {
            secret: string;
        };
    };
};
declare global {
    namespace Nextpress {
        interface CustomContext extends ReturnType<typeof jwtContext["envContext"]> {
        }
    }
}
