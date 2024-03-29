import * as fs from 'fs';
import path from 'path';
import {UPLOADS_DIR} from '../constants/path';

export function createDir(name: string) {
    return new Promise((resolve, reject) => {
        fs.mkdir(path.join(UPLOADS_DIR, name), {recursive: true}, (err) => err ? console.log(err) : resolve(path.join(UPLOADS_DIR, name)));
    });
}
