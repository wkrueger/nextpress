export declare const context: {
    id: string;
    envKeys: string[];
    optionalKeys: string[];
    envContext(): {
        mailgun: {
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
        interface CustomContext extends ReturnType<typeof context["envContext"]> {
        }
    }
}
