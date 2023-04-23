import { getVoiceConnection } from '@discordjs/voice';
import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    GuildMember,
    PermissionsString,
} from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';
import { createRequire } from 'node:module';

import { Language } from '../../../models/enum-helpers/index.js';
import { EventData } from '../../../models/internal-models.js';
import { Lang, VoiceService, voiceServiceInstance } from '../../../services/index.js';
import { PlayResponses } from '../../../services/voice-service.js';
import { InteractionUtils } from '../../../utils/index.js';
import { Command, CommandDeferType } from '../../index.js';

const require = createRequire(import.meta.url);
let Config = require('../../../../config/config.json');

export class PlayCommand implements Command {
    public names = [Lang.getRef('chatCommands.play', Language.Default)];
    public cooldown = new RateLimiter(1, 5000);
    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        let url = intr.options.getString('url');
        console.log('url', url);

        const { guildId, guild, member } = intr;
        const { voice, displayName } = member as GuildMember;

        const channelId = voice?.channelId;
        const adapterCreator = guild.voiceAdapterCreator;

        if (!channelId) {
            await InteractionUtils.send(
                intr,
                Lang.getEmbed('displayEmbeds.notConnected', data.lang, {
                    user: displayName,
                })
            );
            return;
        }
        const botChannelId = (await intr.guild.members.fetch(Config.client.id)).voice.channelId;
        if (botChannelId && botChannelId !== channelId) {
            await InteractionUtils.send(
                intr,
                Lang.getEmbed('displayEmbeds.differentVC', data.lang, {
                    user: displayName,
                })
            );
            return;
        }
        const joinOptions = { channelId, adapterCreator, guildId };

        botChannelId
            ? getVoiceConnection(guildId) ?? (await VoiceService.joinVoice(joinOptions))
            : await VoiceService.joinVoice(joinOptions);

        const resp = await voiceServiceInstance.enqueue(guildId, url);

        let embed: EmbedBuilder;
        switch (resp) {
            case PlayResponses.NOT_VALID_LINK: {
                embed = Lang.getEmbed('displayEmbeds.invalidLink', data.lang);
                break;
            }
            case PlayResponses.SUCCESSFUL_QUEUE: {
                embed = Lang.getEmbed('displayEmbeds.queuedVideo', data.lang);
                embed.addFields(await voiceServiceInstance.generateFieldsFromQueue(guildId, 5));
                break;
            }
            case PlayResponses.SUCCESSFUL_PLAY: {
                embed = Lang.getEmbed('displayEmbeds.playingVideo', data.lang);
                break;
            }
            default: {
                embed = Lang.getEmbed('displayEmbeds.unknown', data.lang);
            }
        }
        await InteractionUtils.send(intr, embed);
    }
}
