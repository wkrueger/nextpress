import knex = require("knex");
declare const _default: {
    id: string;
    envKeys: string[];
    optionalKeys: string[];
    envContext(): {
        database: {
            client: string;
            host: string;
            name: string;
            user: string;
            password: string;
            _db: knex.QueryInterface;
            db(): knex.QueryInterface;
        };
    };
};
export default _default;
