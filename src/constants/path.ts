import path from 'node:path';

export const ROOT_DIR = process.cwd();
export const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
export const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');
