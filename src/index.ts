/*
import {Telegraf} from 'telegraf';
import {ENV} from './constants/env';
import {message} from 'telegraf/filters';


console.log('!!');

const bot = new Telegraf(ENV.BOT_TOKEN);

bot.start((ctx) => ctx.reply('Welcome'));
bot.help((ctx) => ctx.reply('Send me a sticker'));
bot.on(message('sticker'), (ctx) => ctx.reply('👍'));
bot.hears('hi', (ctx) => ctx.reply('Hey there'));
bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
*/

import {bot} from './bot';

bot.start();
