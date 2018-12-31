"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function formatError(err) {
    let axiosError = err && err.response && err.response.data && err.response.data.error;
    if (axiosError) {
        return formatError(axiosError);
    }
    if (err.message) {
        return { error: Object.assign({ message: err.message }, err) };
    }
    if (err.error) {
        return formatError(err.error);
    }
    return { error: { message: String(err) } };
}
exports.formatError = formatError;
//# sourceMappingURL=errot.js.map