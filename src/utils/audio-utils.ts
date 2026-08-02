import { Innertube, UniversalCache, Platform, SessionOptions, Types } from 'youtubei.js';
import fs from 'node:fs';
import path from 'node:path';
import internal, { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

import { Logger } from '../services/logger.js';
import { RegexUtils } from './regex-utils.js';

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

    if (!cookieLoadAttempted) {
        cachedCookieString = loadCookiesAsString();
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

// Clients that actually return downloadable (2xx) media URLs, in priority order.
// WEB / TV_EMBEDDED are good for metadata but their media URLs fail to decipher or
// come back unavailable, so they're excluded here.
const AUDIO_CLIENTS_TO_TRY = ['YTMUSIC', 'MWEB', 'IOS', 'WEB'] as const;

// Resolves once the stream produces its first byte, rejects if it errors (e.g. the
// media URL 403s) or ends empty. Uses 'readable' so no data is consumed — buffered
// bytes still flow to the eventual consumer (FFmpeg). Guards against a silent hang.
const ensureStreamHasData = (stream: internal.Readable): Promise<void> =>
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
        }, 10_000);
        stream.once('readable', onReadable);
        stream.once('error', onError);
        stream.once('end', onEnd);
    });

export const getYoutubeAudio = async (url: string): Promise<internal.Readable> => {
    const videoId = RegexUtils.extractYoutubeVideoId(url);
    if (!videoId) {
        throw new Error('Invalid YouTube URL');
    }

    const innertube = await getInnertubeInstance();

    let lastError: any;
    // Different clients expose different (and sometimes non-ciphered / non-403'd)
    // media URLs, and download() can "succeed" while the URL later 403s — so try
    // each client and verify real bytes flow before committing to it.
    for (const clientType of AUDIO_CLIENTS_TO_TRY) {
        try {
            Logger.info('AUDIO_FETCH_START', { clientType, videoId });

            const info = await innertube.getBasicInfo(videoId, { client: clientType as any });
            // type:'audio' selects the best audio-only adaptive format regardless of
            // codec (opus/webm or aac/mp4) — FFmpeg transcodes either to Opus for us.
            const stream = await info.download({
                type: 'audio',
                quality: 'best',
            });

            const nodeStream = Readable.fromWeb(stream, {
                highWaterMark: 1 << 25,
            });

            await ensureStreamHasData(nodeStream);

            Logger.info('AUDIO_FETCH_SUCCESSFUL', { clientType });
            return nodeStream;
        } catch (e: any) {
            lastError = e;
            Logger.error('AUDIO_FETCH_EXCEPTION', { clientType, message: e.message });
            continue;
        }
    }

    Logger.error('AUDIO_FETCH_ALL_CLIENTS_FAILED', { videoId, message: lastError?.message });
    throw lastError ?? new Error('No downloadable audio formats found for any client');
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
