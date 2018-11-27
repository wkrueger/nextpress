"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const enMessages = require("./en");
exports.messages = enMessages;
function setWithLanguage(lang) {
    exports.messages = require("./" + lang);
}
exports.setWithLanguage = setWithLanguage;
//# sourceMappingURL=messages.js.map