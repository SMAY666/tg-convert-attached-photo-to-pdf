import {uuid} from 'uuidv4';

export function generateUnicFilename(): string {
    return `${uuid()}${Date.now()}`;
}
