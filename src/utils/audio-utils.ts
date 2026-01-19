import { Innertube, UniversalCache, Platform, SessionOptions } from 'youtubei.js';
import fs from 'node:fs';
import path from 'node:path';
import internal, { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

import { Logger } from '../services/logger.js';
import { RegexUtils } from './regex-utils.js';

// Set up the JavaScript evaluator for deciphering URLs
// This is required for Node.js to run YouTube's obfuscated signature code
Platform.shim.eval = (data: any, env: Record<string, any>) => {
    // data.output contains an IIFE that returns an object with sigFunction, nFunction, rawValues
    // We need to execute it, then call the returned functions with env values

    const exportedVars = new Function(`${data.output}\nreturn exportedVars;`)();

    const result: Record<string, string> = {};

    if (env.n && typeof exportedVars.nFunction === 'function') {
        result.n = exportedVars.nFunction(env.n);
    }

    if (env.sig && typeof exportedVars.sigFunction === 'function') {
        result.sig = exportedVars.sigFunction(env.sig);
    }

    return result;
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

export const getYoutubeAudio = async (url: string): Promise<internal.Readable> => {
    const videoId = RegexUtils.extractYoutubeVideoId(url);
    if (!videoId) {
        throw new Error('Invalid YouTube URL');
    }

    const innertube = await getInnertubeInstance();

    try {
        Logger.info('AUDIO_FETCH_START', { videoId });

        const info = await innertube.getBasicInfo(videoId);
        const stream = await info.download({
            codec: 'mp4a',
            quality: 'best',
        });

        Logger.info('AUDIO_FETCH_SUCCESSFUL');

        const nodeStream = Readable.fromWeb(stream, {
            highWaterMark: 1 << 25,
        });
        return nodeStream;
    } catch (e: any) {
        Logger.error('AUDIO_FETCH_EXCEPTION', { message: e.message });

        try {
            Logger.info('RETRY_AUDIO_FETCH_START');
            const info = await innertube.getBasicInfo(videoId);
            const stream = await info.download({
                quality: 'bestefficiency',
            });

            Logger.info('RETRY_AUDIO_FETCH_SUCCESSFUL');
            const nodeStream = Readable.fromWeb(stream, {
                highWaterMark: 1 << 25,
            });
            return nodeStream;
        } catch (fallbackError: any) {
            Logger.error('RETRY_AUDIO_FETCH_EXCEPTION', { message: fallbackError.message });
            throw fallbackError;
        }
    }
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
