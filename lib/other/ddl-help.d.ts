export declare const ddlHelp: <Schema extends Field[]>(i: Schema) => Schema;
export declare type Field = {
    name: string;
    of: Types;
    nullable?: boolean;
    default?: string | number | Raw | AutoIncrement;
};
declare enum Raw {
}
declare enum AutoIncrement {
    get
}
export declare type Types = NumberTypes | DateTypes | StringTypes;
declare type NumberTypes = {
    type: "tinyint" | "boolean" | "smallint" | "mediumint" | "int" | "bigint";
    unsigned?: boolean;
    zerofill?: boolean;
    precision?: number;
} | {
    type: "decimal" | "float" | "double";
    unsigned?: boolean;
    precision?: number;
    decimals?: number;
} | {
    type: "serial";
};
declare type DateTypes = {
    type: "date" | "timestamp" | "time";
    fractionalSecondsPrecision?: number;
} | {
    type: "year";
};
declare type StringTypes = {
    type: "char" | "varchar";
    national?: boolean;
    size?: number;
    charset?: string;
    collate?: string;
} | {
    type: "binary" | "varbinary" | "blob";
    size?: number;
} | {
    type: "tinyblob" | "mediumblob" | "longblob";
} | {
    type: "tinytext" | "text" | "mediumtext" | "longtext";
    charset?: string;
    collate?: string;
} | {
    type: "enum" | "set";
    options: string[];
    charset?: string;
    collate?: string;
};
export declare type IndexDef = {
    name: string;
    columns: string[];
    unique?: boolean;
    algorithm?: string;
};
export {};
