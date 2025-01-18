import ytdl from '@distube/ytdl-core';
import fs from 'node:fs';
import internal from 'node:stream';

import { Logger } from '../services/logger.js';

export const getYoutubeAudio = (url: string): internal.Readable => {
    try {
        const agent = ytdl.createAgent(JSON.parse(fs.readFileSync('cookies.json', 'utf8')));
        return ytdl(url, {
            quality: 'highestaudio',
            filter: 'audioonly',
            highWaterMark: 1 << 25,
            agent,
        });
    } catch (e) {
        Logger.error('out-of-date-cookies', e);
        return ytdl(url, {
            quality: 'highestaudio',
            filter: 'audioonly',
            highWaterMark: 1 << 25,
        });
    }
};

export const getYoutubeInfo = async (url: string): Promise<ytdl.videoInfo> =>
    await ytdl.getBasicInfo(url);
