export declare const context: {
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
declare global {
    namespace Nextpress {
        interface CustomContext extends ReturnType<typeof context["envContext"]> {
        }
    }
}
