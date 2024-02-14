import 'dotenv/config';
import {cleanEnv, str} from 'envalid';

export const ENV = Object.assign(
    process.env,
    cleanEnv(process.env, {
        BOT_TOKEN: str({
            default: 'bot_token',
        }),
        API_URL: str({
            default: 'https://api.telegram.org',
        }),
    }),
);
