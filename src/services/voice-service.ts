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
}
export class VoiceService {
    public playerMap = new Map<string, AudioPlayer>();
    private queueMap: { [key: string]: ytdl.videoInfo[] } = {};

    public static async joinVoice(
        options: JoinVoiceChannelOptions & CreateVoiceConnectionOptions
    ): Promise<VoiceConnection> {
        console.log('creating new connection');
        let connection = joinVoiceChannel(options);
        connection = connection.on(VoiceConnectionStatus.Disconnected, () => {
            voiceServiceInstance.clearQueue(options.guildId);
        });
        return connection;
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

    public async generateFieldsFromQueue(
        guildId: string,
        totalFields: number
    ): Promise<APIEmbedField[]> {
        let fields: APIEmbedField[] =
            this.queueMap[guildId]?.map((info, index) => ({
                name: `${index + 1}`,
                value: info.videoDetails.title,
            })) || [];
        fields.splice(totalFields);
        return fields;
    }

    public createPlayer(guildId: string): AudioPlayer {
        let player = createAudioPlayer();

        player = player.on(AudioPlayerStatus.Idle, () => {
            console.log('idle');
            this.dequeue(player, guildId);
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
        this.dequeue(player, guildId);
        return true;
    }

    public dequeue(player: AudioPlayer, guildId: string): void {
        this.queueMap[guildId].shift();

        this.playAudio(player, guildId);
    }

    public async clearQueue(guildId: string): Promise<void> {
        this.queueMap[guildId] = [];
        const player = this.playerMap.get(guildId);
        if (!player) return;

        player.stop();
        player.removeAllListeners();
        this.playerMap.delete(guildId);
    }

    public async enqueue(guildId: string, url: string): Promise<PlayResponses> {
        const isValid = RegexUtils.youtubeLink(url);
        if (!isValid) return PlayResponses.NOT_VALID_LINK;

        if (!this.queueMap[guildId]) this.queueMap[guildId] = [];
        this.queueMap[guildId].push(await getYoutubeInfo(url));

        if (this.queueMap[guildId].length > 1) return PlayResponses.SUCCESSFUL_QUEUE;

        const player = this.playerMap.get(guildId) || this.createPlayer(guildId);

        this.playAudio(player, guildId);
        return PlayResponses.SUCCESSFUL_PLAY;
    }

    public async playAudio(player: AudioPlayer, guildId: string): Promise<void> {
        const url = this.queueMap[guildId][0];
        if (!url) return;

        try {
            const conn = getVoiceConnection(guildId);

            let stream = getYoutubeAudio(url);

            stream = stream.on('end', () => {
                stream.destroy();
            });

            const resource = createAudioResource(stream);
            conn.subscribe(player);
            player.play(resource);
        } catch (err: any) {
            this.skip(guildId);
            Logger.error('Error during audio setup', err);
        }
    }
}
