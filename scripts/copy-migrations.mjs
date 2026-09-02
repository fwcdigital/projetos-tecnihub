import fs from 'fs';
import path from 'path';

const source = path.resolve('server', 'database', 'migrations');
const destination = path.resolve('dist', 'migrations');

fs.mkdirSync(destination, { recursive: true });
fs.cpSync(source, destination, { recursive: true });

