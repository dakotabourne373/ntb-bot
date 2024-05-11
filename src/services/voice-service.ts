import {
    AudioPlayer,
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    CreateVoiceConnectionOptions,
    getVoiceConnection,
    joinVoiceChannel,
    JoinVoiceChannelOptions,
    VoiceConnection,
    VoiceConnectionStatus,
} from '@discordjs/voice';
import { APIEmbedField } from 'discord.js';
import { Readable } from 'node:stream';
import ytdl from 'ytdl-core';

import { voiceServiceInstance } from './index.js';
import { Logger } from './logger.js';
import { getYoutubeAudio, getYoutubeInfo } from '../utils/audio-utils.js';
import { RegexUtils } from '../utils/regex-utils.js';

export enum PlayResponses {
    SUCCESSFUL_QUEUE,
    SUCCESSFUL_PLAY,
    ERROR_PLAYING,
    ERROR_QUEUEING,
    NOT_VALID_LINK,
    UNAVAILABLE_VIDEO,
}

export enum ClearResponses {
    SUCCESSFUL_CLEAR,
    UNNECESSARY,
    ERROR,
}

interface VideoInfo {
    url: string;
    title: string;
}

interface AudioMetadata {
    stream?: Readable;
    videoInfo: VideoInfo;
}

export class VoiceService {
    public playerMap = new Map<string, AudioPlayer>();
    private queueMap = new Map<string, AudioMetadata[]>();
    private totalRemoved = 0;

    private async checkAndRunGc(): Promise<void> {
        Logger.info('totalRemoved', { total: this.totalRemoved });
        if (global.gc && this.totalRemoved >= 4) {
            global.gc();
            this.totalRemoved = 0;
            Logger.info('Running garbage collection manually');
        }
    }

    private getQueueIfExists(guildId: string) {
        return this.queueMap.get(guildId) || [];
    }

    public static async joinVoice(
        options: JoinVoiceChannelOptions & CreateVoiceConnectionOptions
    ): Promise<VoiceConnection> {
        Logger.info('creating new connection', options);

        return joinVoiceChannel(options).once(VoiceConnectionStatus.Disconnected, () => {
            voiceServiceInstance.clearQueue(options.guildId);
        });
    }

    public async leaveVoice(guildId: string): Promise<void> {
        this.clearQueue(guildId);
        const conn = getVoiceConnection(guildId);
        if (conn) conn.destroy();
    }

    public async pause(guildId: string): Promise<boolean> {
        const player = this.playerMap.get(guildId);
        if (!player) return false;

        return player.pause();
    }

    public async resume(guildId: string): Promise<boolean> {
        const player = this.playerMap.get(guildId);
        if (!player) return false;

        return player.unpause();
    }

    public createPlayer(guildId: string): AudioPlayer {
        let player = createAudioPlayer();

        player = player.on(AudioPlayerStatus.Idle, () => {
            console.log('idle');
            this.dequeue(guildId);
        });
        player = player.on('error', error => {
            Logger.error('Error during audio playback', error);
        });

        this.playerMap.set(guildId, player);
        return player;
    }

    public skip(guildId: string): boolean {
        const player = this.playerMap.get(guildId);
        if (!player) return false;

        player.stop();
        return true;
    }

    public dequeue(guildId: string): void {
        const queue = this.queueMap.get(guildId);
        if (!queue || !queue[0]) {
            return;
        }

        queue[0].stream && queue[0].stream.pause().destroy();
        queue.shift();
        this.queueMap.set(guildId, queue);

        this.totalRemoved++;
        this.checkAndRunGc();

        if (this.getQueueIfExists(guildId).length > 0) this.playAudio(guildId);
        else this.queueMap.delete(guildId);
    }

    public async clearQueue(guildId: string): Promise<ClearResponses> {
        const queue = this.getQueueIfExists(guildId);
        if (!queue.length) return ClearResponses.UNNECESSARY;
        try {
            const player = this.playerMap.get(guildId);
            if (player) {
                player.stop();
                player.removeAllListeners();
            }
            this.totalRemoved += queue.length;
            queue[0].stream && queue[0].stream.pause().emit('end');

            this.queueMap.delete(guildId);
            this.playerMap.delete(guildId);
            this.checkAndRunGc();
        } catch (err: any) {
            Logger.error('Error clearing queue', err);
            return ClearResponses.ERROR;
        }
        return ClearResponses.SUCCESSFUL_CLEAR;
    }

    public async enqueue(guildId: string, url: string): Promise<PlayResponses> {
        const isValid = RegexUtils.youtubeLink(url);
        if (!isValid) return PlayResponses.NOT_VALID_LINK;

        const queue = this.getQueueIfExists(guildId);

        const resp = await getYoutubeInfo(url).catch((err: any) => {
            Logger.error('Failed to Grab Video info', err);
            return PlayResponses.UNAVAILABLE_VIDEO;
        });
        if (resp === PlayResponses.UNAVAILABLE_VIDEO) return resp;

        let { videoDetails } = resp as ytdl.videoInfo;
        queue.push({ videoInfo: { url, title: videoDetails.title } });

        if (queue.length > 1) return PlayResponses.SUCCESSFUL_QUEUE;

        this.playerMap.get(guildId) ?? this.playerMap.set(guildId, this.createPlayer(guildId));

        this.queueMap.set(guildId, queue);
        this.playAudio(guildId);
        return PlayResponses.SUCCESSFUL_PLAY;
    }

    public async playAudio(guildId: string): Promise<void> {
        const queue = this.getQueueIfExists(guildId);
        if (!queue.length) return;

        const nextTrack = queue[0];
        if (!nextTrack.videoInfo) return;

        try {
            const conn = getVoiceConnection(guildId);

            if (!conn) throw new Error('no connection found');

            let stream = getYoutubeAudio(nextTrack.videoInfo.url);

            stream = stream.once('end', () => {
                stream.destroy();
            });

            queue[0].stream = stream;
            this.queueMap.set(guildId, queue);

            const resource = createAudioResource(stream);
            const player = this.playerMap.get(guildId) ?? this.createPlayer(guildId);

            conn.subscribe(player);
            player.play(resource);
            this.playerMap.set(guildId, player);
        } catch (err: any) {
            this.skip(guildId);
            Logger.error('Error during audio setup', err);
        }
    }

    public async generateFieldsFromQueue(
        guildId: string,
        totalFields: number
    ): Promise<APIEmbedField[]> {
        let fields: APIEmbedField[] =
            this.queueMap.get(guildId)?.map(({ videoInfo }, index: number) => ({
                name: `${index + 1}`,
                value: `[${videoInfo.title}](${videoInfo.url})`,
            })) || [];
        fields.splice(totalFields);
        return fields;
    }
}
