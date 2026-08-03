import { Innertube, UniversalCache, Platform, SessionOptions, Types } from 'youtubei.js';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import internal from 'node:stream';
import { fileURLToPath } from 'node:url';

import { Logger } from '../services/logger.js';
import { RegexUtils } from './regex-utils.js';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));

// Bundled yt-dlp binary (see scripts/setup-ytdlp.mjs). yt-dlp handles po_token,
// SABR streaming, signature deciphering and gated/licensed content that the
// youtubei.js download path cannot — so it drives the actual audio stream.
const YT_DLP_BINARY = path.join(
    MODULE_DIR,
    '..',
    '..',
    'bin',
    process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
);

// Set up the JavaScript evaluator for deciphering URLs
// data.output already includes the return statement injected by youtubei.js
Platform.shim.eval = async (
    data: Types.BuildScriptResult,
    _env: Record<string, Types.VMPrimative>
) => {
    return new Function(data.output)();
};

// Module-level cache
let cachedCookieString: string | null = null;
let cookieLoadAttempted = false;
let cachedInnertube: Innertube | null = null;

const loadCookiesAsString = (): string | null => {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const cookiesPath = path.join(__dirname, 'cookies.json');

        const cookiesRaw = fs.readFileSync(cookiesPath, 'utf8').trim();
        if (!cookiesRaw || cookiesRaw === '[]') {
            Logger.warn('UNDEFINED_COOKIES');
            return null;
        }

        const cookiesArray = JSON.parse(cookiesRaw);

        if (!Array.isArray(cookiesArray) || cookiesArray.length === 0) {
            Logger.warn('EMPTY_COOKIES_FILE');
            return null;
        }

        // Convert to semicolon-separated string
        const cookieString = cookiesArray
            .map((cookie: any) => `${cookie.name}=${cookie.value}`)
            .join('; ');

        Logger.info('Cookies loaded successfully');
        return cookieString;
    } catch (e) {
        Logger.error('COOKIE_LOADING_EXCEPTION', e);
        return null;
    }
};

const getInnertubeInstance = async (): Promise<Innertube> => {
    if (cachedInnertube) {
        return cachedInnertube;
    }

    // Only feed cookies to youtubei.js when explicitly opted in with fresh, valid
    // cookies — stale cookies cause 403s. See YT_DLP_USE_COOKIES note below.
    if (!cookieLoadAttempted) {
        cachedCookieString =
            process.env.YT_DLP_USE_COOKIES === 'true' ? loadCookiesAsString() : null;
        cookieLoadAttempted = true;
    }

    const config: SessionOptions = {
        cache: new UniversalCache(false),
        generate_session_locally: true,
        retrieve_player: true, // Required to get signature decipher functions
    };

    if (cachedCookieString) {
        config.cookie = cachedCookieString;
    }

    cachedInnertube = await Innertube.create(config);
    return cachedInnertube;
};

// Resolves once the stream produces its first byte, rejects if it errors or ends
// empty. Uses 'readable' so no data is consumed — buffered bytes still flow to the
// eventual consumer (FFmpeg). Guards against a silent hang.
const ensureStreamHasData = (stream: internal.Readable, timeoutMs: number): Promise<void> =>
    new Promise((resolve, reject) => {
        const cleanup = (): void => {
            clearTimeout(timer);
            stream.off('readable', onReadable);
            stream.off('error', onError);
            stream.off('end', onEnd);
        };
        const onReadable = (): void => {
            cleanup();
            resolve();
        };
        const onError = (e: Error): void => {
            cleanup();
            reject(e);
        };
        const onEnd = (): void => {
            cleanup();
            reject(new Error('stream ended before any data'));
        };
        const timer = setTimeout(() => {
            cleanup();
            reject(new Error('timed out waiting for first audio byte'));
        }, timeoutMs);
        stream.once('readable', onReadable);
        stream.once('error', onError);
        stream.once('end', onEnd);
    });

// Converts the browser-exported cookies.json (Cookie-Editor format) into the
// Netscape cookies.txt format yt-dlp expects. Optional — yt-dlp plays public
// content without it; cookies only unlock age-restricted / private videos.
let cachedCookiesTxtPath: string | null | undefined;
const getCookiesTxtPath = (): string | null => {
    if (cachedCookiesTxtPath !== undefined) {
        return cachedCookiesTxtPath;
    }
    try {
        const jsonPath = path.join(MODULE_DIR, 'cookies.json');
        if (!fs.existsSync(jsonPath)) {
            cachedCookiesTxtPath = null;
            return null;
        }
        const cookies = JSON.parse(fs.readFileSync(jsonPath, 'utf8').trim());
        if (!Array.isArray(cookies) || cookies.length === 0) {
            cachedCookiesTxtPath = null;
            return null;
        }
        const lines = ['# Netscape HTTP Cookie File', ''];
        for (const c of cookies) {
            const domain = c.domain || '.youtube.com';
            const includeSub = domain.startsWith('.') ? 'TRUE' : 'FALSE';
            const expiry = Math.floor(c.expirationDate || c.expires || 0);
            lines.push(
                [domain, includeSub, c.path || '/', c.secure ? 'TRUE' : 'FALSE', expiry, c.name, c.value].join(
                    '\t'
                )
            );
        }
        const txtPath = path.join(MODULE_DIR, 'cookies.txt');
        fs.writeFileSync(txtPath, lines.join('\n'));
        Logger.info('Cookies converted for yt-dlp');
        cachedCookiesTxtPath = txtPath;
        return txtPath;
    } catch (e: any) {
        Logger.warn('COOKIES_TXT_CONVERSION_FAILED', { message: e.message });
        cachedCookiesTxtPath = null;
        return null;
    }
};

export const getYoutubeAudio = async (url: string): Promise<internal.Readable> => {
    const videoId = RegexUtils.extractYoutubeVideoId(url);
    if (!videoId) {
        throw new Error('Invalid YouTube URL');
    }

    if (!fs.existsSync(YT_DLP_BINARY)) {
        throw new Error(`yt-dlp binary not found at ${YT_DLP_BINARY} — run 'npm run setup:ytdlp'`);
    }

    const args = [
        '-f',
        'bestaudio/best', // best audio-only stream; FFmpeg transcodes to Opus downstream
        '--no-playlist',
        '--no-part',
        '--no-cache-dir',
        '--no-progress',
        '--quiet',
        // Fetch in bounded HTTP chunks so a slow downstream consumer (Discord plays
        // at ~real-time) never leaves a single long-lived connection idle long enough
        // for YouTube to drop it. Each chunk is a fresh, short-lived range request.
        '--http-chunk-size',
        '10M',
        // Never give up on a transient stall mid-song.
        '--retries',
        'infinite',
        '--fragment-retries',
        'infinite',
        '--socket-timeout',
        '30',
        '-o',
        '-', // stream to stdout
    ];

    // Cookies are OFF by default: public content plays fine anonymously, and
    // stale/rotated cookies make YouTube 403 *harder* than no cookies. Opt in with
    // YT_DLP_USE_COOKIES=true only when supplying fresh, valid cookies (e.g. for
    // age-restricted videos).
    if (process.env.YT_DLP_USE_COOKIES === 'true') {
        const cookiesTxt = getCookiesTxtPath();
        if (cookiesTxt) {
            args.push('--cookies', cookiesTxt);
        }
    }

    args.push(`https://www.youtube.com/watch?v=${videoId}`);

    Logger.info('AUDIO_FETCH_START', { videoId, engine: 'yt-dlp' });

    const child = spawn(YT_DLP_BINARY, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    // Buffer yt-dlp's output so it can download well ahead of playback instead of
    // being throttled to the consumer's rate. A generous highWaterMark holds a
    // typical song in memory, fully decoupling download speed from playback.
    const output = child.stdout.pipe(new internal.PassThrough({ highWaterMark: 1 << 26 }));

    let stderr = '';
    child.stderr.on('data', (d: Buffer) => {
        stderr += d.toString();
    });
    child.on('error', (err: Error) => {
        Logger.error('YTDLP_SPAWN_ERROR', { message: err.message, binary: YT_DLP_BINARY });
        output.destroy(err);
    });
    child.on('close', (code: number | null) => {
        if (code !== 0 && code !== null) {
            Logger.error('YTDLP_EXIT_NONZERO', { code, videoId, stderr: stderr.slice(-500) });
            if (!output.destroyed) {
                output.destroy(new Error(`yt-dlp exited ${code}`));
            }
        }
    });

    // yt-dlp extraction (page fetch + po_token + format selection) can take several
    // seconds before the first byte, so allow a generous startup window.
    try {
        await ensureStreamHasData(output, 25_000);
    } catch (err: any) {
        try {
            child.kill('SIGKILL');
        } catch {
            /* already gone */
        }
        Logger.error('AUDIO_FETCH_EXCEPTION', {
            videoId,
            message: err.message,
            stderr: stderr.slice(-500),
        });
        throw err;
    }

    Logger.info('AUDIO_FETCH_SUCCESSFUL', { videoId, engine: 'yt-dlp' });
    return output;
};

// Client types to try - prioritize clients that work better for streaming
const CLIENTS_TO_TRY = ['YTMUSIC', 'WEB', 'TV_EMBEDDED'] as const;

export const getYoutubeInfo = async (
    url: string
): Promise<ReturnType<typeof innertube.getBasicInfo> | null> => {
    const videoId = RegexUtils.extractYoutubeVideoId(url);
    if (!videoId) {
        throw new Error('Invalid YouTube URL');
    }

    const innertube = await getInnertubeInstance();

    // Try each client until one works
    for (const clientType of CLIENTS_TO_TRY) {
        try {
            Logger.info('INFO_FETCH_START', { clientType, videoId });
            const info = await innertube.getBasicInfo(videoId, { client: clientType as any });

            // Check if we got streaming data
            if (info.streaming_data) {
                Logger.info('INFO_FETCH_SUCCESSFUL', { clientType, videoId });
                return info;
            }
            Logger.info('INFO_FETCH_NO_STREAMING_DATA', { clientType, videoId });
        } catch (e: any) {
            Logger.error('INFO_FETCH_EXCEPTION', { clientType, message: e.message, url });
            continue;
        }
    }

    return null;
};
