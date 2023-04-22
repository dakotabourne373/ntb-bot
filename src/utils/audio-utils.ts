import internal from 'node:stream';
import { downloadFromInfo, getBasicInfo, videoInfo } from 'ytdl-core';

export const getYoutubeAudio = (info: videoInfo): internal.Readable =>
    downloadFromInfo(info, {
        quality: 'highestaudio',
        filter: 'audioonly',
    });

export const getYoutubeInfo = async (url: string): Promise<videoInfo> => await getBasicInfo(url);
