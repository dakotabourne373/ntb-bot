// Copies non-TypeScript runtime assets into dist/ after `tsc` (which only emits .js).
// Notably cookies.json, which audio-utils reads relative to its own compiled path.
import fs from 'node:fs';
import path from 'node:path';

const copies = [['src/utils/cookies.json', 'dist/utils/cookies.json']];

for (const [src, dst] of copies) {
    if (fs.existsSync(src)) {
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.copyFileSync(src, dst);
        console.log(`copied ${src} -> ${dst}`);
    }
}
