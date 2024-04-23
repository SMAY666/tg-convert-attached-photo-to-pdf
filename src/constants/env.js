"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENV = void 0;
require("dotenv/config");
const envalid_1 = require("envalid");
exports.ENV = Object.assign(process.env, (0, envalid_1.cleanEnv)(process.env, {
    BOT_TOKEN: (0, envalid_1.str)({
        default: 'bot_token',
    }),
}));
