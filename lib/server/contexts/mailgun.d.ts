declare const _default: {
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
export default _default;
