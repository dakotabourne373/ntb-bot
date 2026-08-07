// Downloads the yt-dlp standalone binary into ./bin if it isn't already present.
// Runs on postinstall; non-fatal so a failed download never breaks `npm install`
// (the audio code surfaces a clear error at runtime if the binary is missing).
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const BIN_DIR = path.join(process.cwd(), 'bin');
const isWin = process.platform === 'win32';
const isMac = process.platform === 'darwin';

const assetName = isWin ? 'yt-dlp.exe' : isMac ? 'yt-dlp_macos' : 'yt-dlp';
const targetName = isWin ? 'yt-dlp.exe' : 'yt-dlp';
const target = path.join(BIN_DIR, targetName);
const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${assetName}`;

async function main() {
    if (fs.existsSync(target)) {
        console.log(`yt-dlp already present at ${target}`);
        return;
    }
    fs.mkdirSync(BIN_DIR, { recursive: true });
    console.log(`Downloading yt-dlp (${assetName}) ...`);
    const res = await fetch(url);
    if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
    }
    await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(target));
    if (!isWin) {
        fs.chmodSync(target, 0o755);
    }
    console.log(`yt-dlp saved to ${target}`);
}

main().catch(err => {
    console.warn(`[setup-ytdlp] Could not download yt-dlp: ${err.message}`);
    console.warn(`[setup-ytdlp] Download it manually from https://github.com/yt-dlp/yt-dlp/releases into ./bin`);
    // Exit 0 so install/postinstall does not fail on offline or network errors.
});
