import {Context, Telegraf} from 'telegraf';
import {ENV} from '../constants/env';
import fs from 'fs';
import {sendRequest} from '../requests';
import {message} from 'telegraf/filters';

class Bot {
    constructor() {
        this.botInstance = new Telegraf(ENV.BOT_TOKEN);
    }


    // ----- [ PRIVATE MEMBERS ] ---------------------------------------------------------------------------------------

    private readonly botInstance: Telegraf<Context>;


    // ----- [ PRIVATE METHODS ] ---------------------------------------------------------------------------------------

    private checkUpdates() {
        this.botInstance.on('message', (ctx) => this.getAttachments(ctx));
    }

    private getAttachments(context: any) {
        console.log(context.update);
        sendRequest('GET', `${ENV.API_URL}/bot${ENV.BOT_TOKEN}/getUpdates`)
            .then((updated) => console.log(updated.data))
            .catch((err) => console.log(err));
    }

    // ----- [ PUBLIC METHODS ] ----------------------------------------------------------------------------------------

    public start() {
        this.botInstance.launch();
        this.checkUpdates();
    }
}

export const bot = new Bot();
