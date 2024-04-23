import 'dotenv/config';
import {cleanEnv, str, makeValidator} from 'envalid';

const arr = makeValidator<string[]>((input: string) => input.split(','));

export const ENV = Object.assign(
    process.env,
    cleanEnv(process.env, {
        BOT_TOKEN: str({
            default: 'bot_token',
        }),
        API_URL: str({
            default: 'https://api.telegram.org',
        }),
        WHITE_LIST: arr(),
    }),
);
