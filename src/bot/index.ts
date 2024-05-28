import path from 'path';
import * as fs from 'fs';
import {Readable} from 'node:stream';

import TelegramBot from 'node-telegram-bot-api';

import PDFDocument from 'pdfkit';
import {ENV} from '../constants/env';
import {generateUnicFilename} from '../utils/generateUnicFilename';
import {UPLOADS_DIR} from '../constants/path';


class Bot {
    constructor() {
        this.botInstance = new TelegramBot(ENV.BOT_TOKEN, {polling: true});
        this.commands = [
            {command: 'save', description: 'Выполните команду перед использованием бота'},
            {command: 'photos', description: 'Количество фотографий в списке'},
            {command: 'done', description: 'Выполните команду после отправки всех фотографий'},
            {command: 'help', description: 'Список команд бота'},
        ];

        this.users = new Map();
        this.serverPdfName = '';
    }


    // ----- [ PRIVATE MEMBERS ] ---------------------------------------------------------------------------------------

    private readonly botInstance: TelegramBot;
    private readonly commands: {
        command: string
        description: string
    }[];

    private readonly users: Map<string, {inProcess: boolean, photos: Buffer[]}>;
    private serverPdfName: string;

    // ----- [ PRIVATE METHODS ] ---------------------------------------------------------------------------------------

    private userHasAccess(username: string): boolean {
        return ENV.WHITE_LIST.includes(username);
    }

    private checkUpdates(): void {
        this.botInstance.on('message', async (message) => {
            if (!message.from?.username || !this.userHasAccess(message.from?.username)) {
                await this.sendMessageToUser(message.chat.id, 'У вас нет доступа для взаимодействия со мной');
            } else {
                const userPhotos = this.users.get(message.chat.id.toString())?.photos;
                switch (message.text) {
                    case '/start':
                        await this.showInstruction(message.chat.id);
                        break;
                    case '/help':
                        await this.showInstruction(message.chat.id);
                        break;
                    case '/save':
                        await this.activateSave(message.chat.id);
                        break;
                    case '/photos':
                        await this.sendMessageToUser(message.chat.id, `Кол-во фотографий: ${userPhotos?.length ?? 0}`);
                        if (userPhotos && userPhotos.length > 0 && userPhotos.length <= 5) {
                            await this.sendMessageToUser(message.chat.id, undefined, undefined, userPhotos);
                        }
                        break;
                    case '/done':
                        await this.doneSave(message.chat.id);
                        break;
                    default:
                        await this.getAttachments(message);
                        break;
                }
            }
        });
    }

    private async getAttachments(message: TelegramBot.Message): Promise<void> {
        if (!message.photo) {
            await this.sendMessageToUser(message.chat.id, 'Сообщение должно содержать фотографии или быть командой (Menu)');
            return;
        }

        const photoFromMessage = message.photo[message.photo.length - 1];

        const files = this.users.get(message.chat.id.toString())?.photos;
        const stream = this.botInstance.getFileStream(photoFromMessage.file_id);
        const buffer = await this.streamToBuffer(stream);

        if (files) {
            files.push(buffer);
        } else {
            const user = this.users.get(message.chat.id.toString());
            this.users.set(message.chat.id.toString(), {inProcess: user?.inProcess ?? false, photos: [buffer]});
        }

    }

    private async sendMessageToUser(chatId: number, text?: string, attachmentDocName?: string, photos?: Buffer[]): Promise<void> {
        if (text && !attachmentDocName) {
            await this.botInstance.sendMessage(chatId, text);
        }
        if (attachmentDocName) {
            try {
                const stream = fs.createReadStream(path.join(UPLOADS_DIR, attachmentDocName));

                await this.botInstance.sendDocument(chatId, stream, {
                    ...(text ? {caption: text} : {}),
                }, {
                    filename: 'img2pdfConverter.pdf',
                });
            } catch (error) {
                await this.sendMessageToUser(chatId, 'Извините. Что-то пошло не так..');
            }
        }
        if (photos) {
            for (const photo of photos) {
                await this.botInstance.sendPhoto(chatId, photo);
            }
        }
    }

    private async showInstruction(chatId: number): Promise<void> {
        await this.sendMessageToUser(chatId, 'Вот список команд бота. Для удобства используйте кнопку "Menu"');
        for (const command of this.commands) {
            await this.sendMessageToUser(chatId, `${command.command} - ${command.description}`);
        }
    }

    private async activateSave(chatId: number): Promise<void> {
        const user = this.users.get(chatId.toString());
        if (user && user.inProcess) {
            await this.sendMessageToUser(chatId, 'Можете отправлять фотографии');
            return;
        }
        this.users.set(chatId.toString(), {inProcess: true, photos: []});
        await this.sendMessageToUser(chatId, 'Теперь отправьте мне фотографии, которые нужно сохранить');
    }

    private async doneSave(chatId: number): Promise<void> {
        const user = this.users.get(chatId.toString());
        if (!user || !user.inProcess) {
            await this.sendMessageToUser(chatId, 'Сохранение уже завершено');
            return;
        }
        const photos = this.users.get(chatId.toString())?.photos;
        if (photos && photos.length > 0) {
            await this.sendMessageToUser(chatId, 'Ожидайте ваш файл. Это займёт некоторое время');
            await this.getPdf(photos);
            await this.sendMessageToUser(chatId, ' Вот ваш файл. Спасибо за использование бота!\n' +
                'Если во время работы что-то пошло не так, пожалуйства, напишите сюда: @sm4yy', this.serverPdfName);
            fs.rmSync(path.join(UPLOADS_DIR, this.serverPdfName));
        } else {
            await this.sendMessageToUser(chatId, 'PDF файл не будет создан так как вы не добавили фотографии');
        }
        this.users.delete(chatId.toString());
    }


    // ----- [ PUBLIC METHODS ] ----------------------------------------------------------------------------------------

    public async start(): Promise<void> {
        await this.botInstance.setMyCommands(this.commands);
        console.log(`[${Date.now()}] Bot started`);
        this.checkUpdates();
    }


    // ----- [ HELP METHODS ] ------------------------------------------------------------------------------------------

    private streamToBuffer(stream: Readable): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const chunks: any[] = [];
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('error', reject);
        });
    }

    private getPdf(photos: Buffer[]) {
        const filename = generateUnicFilename('YourPdf.pdf');

        return new Promise((resolve, reject) => {
            try {
                const document = new PDFDocument({autoFirstPage: false});
                const stream = fs.createWriteStream(path.join(UPLOADS_DIR, filename));
                stream.on('finish', () => {
                    this.serverPdfName = filename;
                    resolve(this.serverPdfName);
                });
                stream.on('error', (error) => reject(error));

                document.pipe(stream);


                photos.forEach((photo) => {
                    document.addPage();
                    document.image(photo, 0, 0, {
                        width: document.page.width,
                        height: document.page.height,
                    });
                });

                document.end();

            } catch (error) {
                reject(new Error(`[saveToPdf]: Failed to save photos to pdf ${JSON.stringify(error)}`));
            }
        });
    }

}

export const bot = new Bot();
