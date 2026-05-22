import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outA = path.join(root, 'frontend-admin/shared/assets/flags/cambodia-flag.svg');
const outU = path.join(root, 'frontend-user/shared/assets/flags/cambodia-flag.svg');

// SVG chunks appended below (user-provided official artwork)
let svg = '';
