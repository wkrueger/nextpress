import nextjs = require("next");
declare class Server {
    projectRoot: string;
    constructor(projectRoot: string);
    run(): Promise<void>;
    nextConfig(): any;
}
export { Server, nextjs };
