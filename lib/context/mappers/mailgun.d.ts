export declare const mailgunContext: {
    id: string;
    envKeys: string[];
    optionalKeys: string[];
    envContext({ getKey }: {
        getKey: (s: string) => string | undefined;
    }): {
        email: {
            from: string;
            domain: string;
            apiKey: string;
            sendMail(inp: {
                email: string;
                subject: string;
                html: string;
            }): Promise<any>;
        };
    };
};
declare global {
    namespace Nextpress {
        interface CustomContext extends ReturnType<typeof mailgunContext["envContext"]> {
        }
    }
}
