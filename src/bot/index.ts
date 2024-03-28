import TelegramBot, {PhotoSize} from 'node-telegram-bot-api';
import PDFDocument from 'pdfkit';
import {ENV} from '../constants/env';
import {createWriteStream, writeFileSync} from 'node:fs';
import {sendRequest} from '../requests';

import {generateUnicFilename} from '../utils/generateUnicFilename';
import path from 'node:path';
import {UPLOADS_DIR} from '../constants/path';

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
    private photos: (TelegramBot.PhotoSize & {filePath?: string})[] | null;
    private readonly commands: {
        command: string
        description: string
    }[];


    // ----- [ PRIVATE METHODS ] ---------------------------------------------------------------------------------------

    private userHasAccess(username: string): boolean {
        return ENV.WHITE_LIST.includes(username);
    }


    private checkUpdates(): void {
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

    private async getAttachments(message: TelegramBot.Message): Promise<void> {
        if (!message.photo) {
            await this.sendMessageToUser(message.chat.id, 'Сообщение должно содержать фотографии или быть командой (Menu)');
            return;
        }

        const photoFromMessage = message.photo[message.photo.length - 1];
        this.photos?.push(photoFromMessage);
    }

    private async sendMessageToUser(chatId: number, test: string): Promise<void> {
        await this.botInstance.sendMessage(chatId, test);
    }

    private async activateSave(command: '/save' | '/done', chatId: number): Promise<void> {
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
            if (this.photos && this.photos.length > 0) {
                await this.downloadFile(this.photos[0]);
            } else {
                await this.sendMessageToUser(chatId, 'PDF файл не будет создан так как вы не добавили фотографии');
            }
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

    private async getFilePath(photo: PhotoSize): Promise<string> {
        if (!this.photos) {
            throw new Error('Комманда \"/save\" не была выполнена');
        }
        const response = await sendRequest(
            'GET',
            `${ENV.API_URL}/bot${ENV.BOT_TOKEN}/getFile`,
            {file_id: photo.file_id},
        );

        if (response.data.ok === false) {
            throw new Error('Request failed:', response.data.result);
        }

        const index = this.photos?.findIndex((tgData) => tgData === photo);

        if (index === -1) {
            throw Error('Фотография не из текущей сессии');
        }

        const foundPhoto = this.photos[index];

        foundPhoto.filePath = response.data.result.file_path;

        // @ts-ignore
        return foundPhoto.filePath;
    }

    private async downloadFile(photo: PhotoSize) {
        const filePath = await this.getFilePath(photo);

        const response = await sendRequest(
            'GET',
            `${ENV.API_URL}/file/bot${ENV.BOT_TOKEN}/${filePath}`,
            undefined,
            undefined,
            'arraybuffer',
        );

        if (response.status === 200) {
            writeFileSync(path.join(
                UPLOADS_DIR,
                generateUnicFilename(filePath.replace('/', '-'))), response.data);
        }
    }

    /* private async saveToPdf(photos: PhotoSize[]) {
        const document = new PDFDocument();
        document.pipe(createWriteStream('yourImages.pdf'));
    } */

}

export const bot = new Bot();
