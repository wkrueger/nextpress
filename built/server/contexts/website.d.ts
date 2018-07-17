declare const _default: {
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
export default _default;
