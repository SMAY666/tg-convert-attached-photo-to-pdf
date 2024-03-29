import path from 'path';

export const ROOT_DIR = process.cwd();
export const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
export const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');
export const USER_DIRECTORY = (chatId: number): string => path.join(UPLOADS_DIR, chatId.toString());
