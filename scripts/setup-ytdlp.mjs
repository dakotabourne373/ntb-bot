// Downloads the yt-dlp standalone binary into ./bin, and keeps it up to date.
// YouTube breaks older yt-dlp releases regularly (extraction starts failing with
// "HTTP Error 403: Forbidden"), so a stale binary is a bug, not a saving — this
// checks the installed version against the latest release and re-downloads when
// they differ. Runs on postinstall; non-fatal so a failed download or an offline
// machine never breaks `npm install` (the audio code surfaces a clear error at
// runtime if the binary is missing).
import { execFileSync } from 'node:child_process';
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
const RELEASES = 'https://github.com/yt-dlp/yt-dlp/releases';

const force = process.argv.includes('--force');

const installedVersion = () => {
    try {
        return execFileSync(target, ['--version'], { encoding: 'utf8' }).trim();
    } catch {
        return null;
    }
};

// The /releases/latest URL redirects to /releases/tag/<version>; reading that
// redirect avoids the GitHub API's unauthenticated rate limit.
const latestVersion = async () => {
    const res = await fetch(`${RELEASES}/latest`, { redirect: 'manual' });
    const location = res.headers.get('location');
    const version = location?.split('/tag/')[1];
    if (!version) {
        throw new Error(`could not resolve latest release (HTTP ${res.status})`);
    }
    return version;
};

const download = async version => {
    fs.mkdirSync(BIN_DIR, { recursive: true });
    console.log(`Downloading yt-dlp ${version} (${assetName}) ...`);
    const res = await fetch(`${RELEASES}/latest/download/${assetName}`);
    if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
    }
    // Write beside the target then rename, so an interrupted download never
    // leaves a truncated binary in place of a working one.
    const tmp = `${target}.download`;
    await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(tmp));
    fs.renameSync(tmp, target);
    if (!isWin) {
        fs.chmodSync(target, 0o755);
    }
    console.log(`yt-dlp ${version} saved to ${target}`);
};

async function main() {
    const installed = fs.existsSync(target) ? installedVersion() : null;
    if (installed && force) {
        console.log(`yt-dlp ${installed} present; re-downloading (--force)`);
    }

    const latest = await latestVersion();
    if (installed === latest && !force) {
        console.log(`yt-dlp ${installed} is up to date`);
        return;
    }
    if (installed) {
        console.log(`yt-dlp ${installed} is outdated (latest: ${latest})`);
    }
    await download(latest);
}

main().catch(err => {
    console.warn(`[setup-ytdlp] Could not download yt-dlp: ${err.message}`);
    if (fs.existsSync(target)) {
        console.warn(`[setup-ytdlp] Keeping the existing binary at ${target}`);
    } else {
        console.warn(`[setup-ytdlp] Download it manually from ${RELEASES} into ./bin`);
    }
    // Exit 0 so install/postinstall does not fail on offline or network errors.
});
