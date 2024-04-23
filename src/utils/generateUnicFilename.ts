import {v4 as uuidv4} from 'uuid';
import path from 'path';

export function generateUnicFilename(originalname: string): string {
    return uuidv4() + Date.now() + path.extname(originalname);
}
