import internal from 'node:stream';
import ytdl from 'ytdl-core';

export const getYoutubeAudio = (url: string): internal.Readable =>
    ytdl(url, {
        quality: 'highestaudio',
        filter: 'audioonly',
        highWaterMark: 1 << 25,
    });

export const getYoutubeInfo = async (url: string): Promise<ytdl.videoInfo> =>
    await ytdl.getBasicInfo(url);
