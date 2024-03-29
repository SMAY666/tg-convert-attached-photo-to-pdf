import path from 'path';
import * as fs from 'fs';
import TelegramBot, {PhotoSize} from 'node-telegram-bot-api';
import PDFDocument from 'pdfkit';

import {ENV} from '../constants/env';
import {generateUnicFilename} from '../utils/generateUnicFilename';
import {UPLOADS_DIR} from '../constants/path';
import {createDir} from '../utils/fileTools';

class Bot {
    constructor() {
        this.botInstance = new TelegramBot(ENV.BOT_TOKEN, {polling: true});
        this.commands = [
            {command: 'save', description: 'Выполните команду перед использованием бота'},
            {command: 'photos', description: 'Количество фотогпфий в списке'},
            {command: 'done', description: 'Выполните команду после отправки всех фотографий'},
            {command: 'help', description: 'Список команд бота'},
        ];
        this.inProcess = false;
        this.photos = null;
        this.serverPdfName = '';
    }


    // ----- [ PRIVATE MEMBERS ] ---------------------------------------------------------------------------------------

    private readonly botInstance: TelegramBot;
    private readonly commands: {
        command: string
        description: string
    }[];

    private inProcess: boolean;
    private photos: (TelegramBot.PhotoSize & {pathOnServer?: string})[] | null;
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
                switch (message.text) {
                    case '/start':
                        await this.showInstruction(message.chat.id);
                        await createDir(message.chat.id.toString());
                        break;
                    case '/help':
                        await this.showInstruction(message.chat.id);
                        break;
                    case '/save':
                        await this.activateSave(message.chat.id);
                        break;
                    case '/photos':
                        await this.sendMessageToUser(message.chat.id, `Кол-во фотографий: ${this.photos?.length ?? '0'}`);
                        break;
                    case '/done':
                        await this.doneSave(message.chat.id);
                        break;
                    default:
                        break;
                }
                if (this.inProcess && (message.text !== '/save' && message.text !== '/photos' && message.text !== '/done')) {
                    await this.getAttachments(message);
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
        this.photos?.push(photoFromMessage);
    }

    private async sendMessageToUser(chatId: number, text?: string, attachmentDocName?: string): Promise<void> {
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
    }

    private async showInstruction(chatId: number): Promise<void> {
        await this.sendMessageToUser(chatId, 'Вот список команд бота. Для удобства используйте кнопку "Menu"');
        for (const command of this.commands) {
            await this.sendMessageToUser(chatId, `${command.command} - ${command.description}`);
        }
    }

    private async activateSave(chatId: number): Promise<void> {
        if (this.inProcess) {
            await this.sendMessageToUser(chatId, 'Можете отправлять фотографии');
            return;
        }
        this.photos = [];
        this.inProcess = true;
        await this.sendMessageToUser(chatId, 'Теперь отправьте мне фотографии, которые нужно сохранить');
    }


    private async doneSave(chatId: number): Promise<void> {
        if (!this.inProcess) {
            await this.sendMessageToUser(chatId, 'Сохранение уже завершено');
        }
        await this.sendMessageToUser(chatId, 'Ожидайте ваш файл. Это займёт некоторое время');
        if (this.photos && this.photos.length > 0) {
            for (const photo of this.photos) {
                await this.downloadFile(photo, UPLOADS_DIR);
            }
            await this.getPdf(this.photos);
            await this.sendMessageToUser(chatId, ' Вот ваш файл. Спасибо за использование бота!\n' +
                'Если во время работы что-то пошло не так, пожалуйства, напишите сюда @sm4yy', this.serverPdfName);
        } else {
            await this.sendMessageToUser(chatId, 'PDF файл не будет создан так как вы не добавили фотографии');
        }
        this.photos = null;
        this.inProcess = false;
    }


    // ----- [ PUBLIC METHODS ] ----------------------------------------------------------------------------------------

    public async start(): Promise<void> {
        await this.botInstance.setMyCommands(this.commands);
        console.log('Bot started');
        this.checkUpdates();
    }


    // ----- [ HELP METHODS ] ------------------------------------------------------------------------------------------

    private async downloadFile(photo: PhotoSize & {pathOnServer?: string}, dirToSave: string): Promise<void> {
        try {
            const newFile = await this.botInstance.downloadFile(photo.file_id, dirToSave);

            const filename = generateUnicFilename('photo.jpg').split('.')[0];
            photo.pathOnServer = path.join(dirToSave, filename + path.extname(newFile));

            fs.rename(newFile, photo.pathOnServer, (error) => {
                if (error) {
                    throw new Error(`error: ${JSON.stringify(error)}`);
                }
            });
        } catch (error) {
            throw new Error(`[downloadFiles]: Failed to download file ${JSON.stringify(error)}`);
        }
    }

    private getPdf(photos: (PhotoSize & {filePath?: string, pathOnServer?: string})[]) {
        const filename = generateUnicFilename('YourPdf.pdf');

        return new Promise((resolve, reject) => {
            try {
                const document = new PDFDocument({autoFirstPage: false});
                const stream = fs.createWriteStream(path.join(UPLOADS_DIR, filename));

                stream.on('finish', () => {
                    this.serverPdfName = filename;
                    resolve(this.serverPdfName);
                });

                document.pipe(stream);

                photos.forEach((photo) => {
                    document.addPage();
                    if (photo.pathOnServer) {
                        document.image(photo.pathOnServer, 0, 0, {
                            width: document.page.width,
                            height: document.page.height,
                        });
                    }
                });
                document.end();
            } catch (error) {
                reject(new Error(`[saveToPdf]: Failed to save photos to pdf ${JSON.stringify(error)}`));
            }
        });
    }

}

export const bot = new Bot();
