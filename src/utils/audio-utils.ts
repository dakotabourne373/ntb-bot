import internal from 'node:stream';
import ytdl from 'ytdl-core';

export const getYoutubeAudio = (info: ytdl.videoInfo): internal.Readable =>
    ytdl.downloadFromInfo(info, {
        quality: 'highestaudio',
        filter: 'audioonly',
    });

export const getYoutubeInfo = async (url: string): Promise<ytdl.videoInfo> =>
    await ytdl.getInfo(url);
