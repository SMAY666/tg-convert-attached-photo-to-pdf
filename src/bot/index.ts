import {ENV} from '../constants/env';
import TelegramBot from 'node-telegram-bot-api';


class Bot {
    constructor() {
        this.botInstance = new TelegramBot(ENV.BOT_TOKEN, {polling: true});
        this.inProcess = false;
        this.photos = null;
        this.commands = [
            {command: 'save', description: 'Выполните команду перед использованием бота'},
            {command: 'photos', description: 'Количество фотогпфий в списке'},
            {command: 'done', description: 'Выполните команду после отправки всех фотографий'},
        ];
    }


    // ----- [ PRIVATE MEMBERS ] ---------------------------------------------------------------------------------------

    private readonly botInstance: TelegramBot;
    private inProcess: boolean;
    private photos: TelegramBot.PhotoSize[] | null;
    private readonly commands: {
        command: string
        description: string
    }[];


    // ----- [ PRIVATE METHODS ] ---------------------------------------------------------------------------------------

    private userHasAccess(username: string): boolean {
        return ENV.WHITE_LIST.includes(username);
    }


    private checkUpdates() {
        this.botInstance.on('message', async (message) => {
            if (!message.from?.username || !this.userHasAccess(message.from?.username)) {
                await this.sendMessageToUser(message.chat.id, 'У вас нет доступа для взаимодействия со мной');
            }
            switch (message.text) {
                case '/save':
                    await this.activateSave('/save', message.chat.id);
                    break;
                case '/photos':
                    await this.sendMessageToUser(message.chat.id, `Кол-во фотографий: ${this.photos?.length ?? '0'}`);
                    break;
                case '/done':
                    await this.activateSave('/done', message.chat.id);
                    break;
                default:
                    break;
            }
            if (this.inProcess && (message.text !== '/save' && message.text !== '/photos')) {
                await this.getAttachments(message);
            }
        });
    }

    private async getAttachments(message: TelegramBot.Message) {
        if (!message.photo) {
            await this.sendMessageToUser(message.chat.id, 'Сообщение должно содержать фотографии или быть командой (Menu)');
            return;
        }

        const photoFromMessage = message.photo[message.photo.length - 1];
        this.photos?.push(photoFromMessage);
    }

    private async sendMessageToUser(chatId: number, test: string) {
        await this.botInstance.sendMessage(chatId, test);
    }

    private async activateSave(command: '/save' | '/done', chatId: number) {
        if (command === '/save') {
            if (this.inProcess) {
                await this.sendMessageToUser(chatId, 'Можете отправлять фотографии');
            }
            this.photos = [];
            this.inProcess = true;
            await this.sendMessageToUser(chatId, 'Теперь отправьте мне фотографии, которые нужно сохранить');
        } else if (command === '/done') {
            if (!this.inProcess) {
                await this.sendMessageToUser(chatId, 'Сохранение уже завершено');
            }
            // await this.saveToPdf(this.photos);
            this.photos = null;
            this.inProcess = false;
            await this.sendMessageToUser(chatId, 'Сохранение завершено');
        }
    }


    // ----- [ PUBLIC METHODS ] ----------------------------------------------------------------------------------------

    public async start() {
        await this.botInstance.setMyCommands(this.commands);
        console.log('Bot started');
        this.checkUpdates();
    }


    // ----- [ HELP METHODS ] ------------------------------------------------------------------------------------------

    /* private async saveToPdf(photos: PhotoSize[] | null) {
        if (!photos) {

        }
    } */

}

export const bot = new Bot();
