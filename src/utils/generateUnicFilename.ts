import {v4 as uuidv4} from 'uuid';
import path from 'node:path';

export function generateUnicFilename(originalname: string): string {
    return uuidv4() + Date.now() + `.${path.extname(originalname)}`;
}
