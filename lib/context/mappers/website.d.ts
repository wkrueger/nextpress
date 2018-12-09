export declare const websiteContext: {
    id: string;
    envKeys: string[];
    optionalKeys: string[];
    envContext({ getKey }: {
        getKey: (s: string) => string | undefined;
    }): {
        website: {
            root: string;
            port: number;
            baseUrl: string;
            logRequests: boolean;
            bundleAnalyzer: boolean;
            useCompression: boolean;
            language: string;
        };
    };
};
declare global {
    namespace Nextpress {
        interface CustomContext extends ReturnType<typeof websiteContext["envContext"]> {
        }
    }
}
