// 在所有 entry script 顶部 import './lib/env.js'，确保 .env + .env.local 都被加载
// .env.local 覆盖 .env（约定俗成）

import { config as dotenvConfig } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POC_ROOT = path.resolve(__dirname, '..');

dotenvConfig({ path: path.join(POC_ROOT, '.env') });
dotenvConfig({ path: path.join(POC_ROOT, '.env.local'), override: true });
