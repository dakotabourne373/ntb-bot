import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    GuildMember,
    PermissionsString,
} from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';
import { createRequire } from 'node:module';

import { VoiceErrors, VoiceInfo } from '../../../enums/index.js';
import { Language } from '../../../models/enum-helpers/index.js';
import { EventData } from '../../../models/internal-models.js';
import { Lang, Logger, voiceServiceInstance } from '../../../services/index.js';
import { InteractionUtils } from '../../../utils/index.js';
import { Command, CommandDeferType } from '../../index.js';

const require = createRequire(import.meta.url);
let Config = require('../../../../config/config.json');

enum QueueCommands {
    SHOW = 'show',
    CLEAR = 'clear',
}

export class QueueCommand implements Command {
    public names = [Lang.getRef('chatCommands.queue', Language.Default)];
    public cooldown = new RateLimiter(1, 5000);
    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        const command = intr.options.getSubcommand() as QueueCommands;
        const errorParams = { command: intr.commandName };
        const { guildId, guild, member } = intr;
        const { channelId: botChannelId } = (await guild.members.fetch(Config.client.id)).voice;
        const { voice, displayName } = member as GuildMember;

        const { channelId } = voice;

        if (!botChannelId) {
            InteractionUtils.send(intr, Lang.getEmbed('displayEmbeds.botNotConnected', data.lang));
            Logger.error(VoiceErrors.BOT_NOT_CONNECTED, errorParams);
            return;
        }

        if (!channelId) {
            InteractionUtils.send(
                intr,
                Lang.getEmbed('displayEmbeds.userNotConnected', data.lang, { user: displayName })
            );
            Logger.error(VoiceErrors.USER_NOT_CONNECTED, errorParams);
            return;
        }

        if (botChannelId !== channelId) {
            InteractionUtils.send(
                intr,
                Lang.getEmbed('displayEmbeds.differentVC', data.lang, { user: displayName })
            );
            Logger.error(VoiceErrors.USER_IN_DIFFERENT_CHANNEL, errorParams);
            return;
        }

        let embed: EmbedBuilder = new EmbedBuilder();
        switch (command) {
            case QueueCommands.SHOW: {
                embed = embed
                    .setTitle('Current Queue')
                    .addFields(await voiceServiceInstance.generateFieldsFromQueue(guildId, 5));
                Logger.info(VoiceInfo.SHOWING_QUEUE);
                break;
            }
            case QueueCommands.CLEAR: {
                voiceServiceInstance.clearQueue(guildId);
                embed = Lang.getEmbed('displayEmbeds.clearingQueue', data.lang);
                Logger.info(VoiceInfo.CLEARING_QUEUE);
            }
        }

        InteractionUtils.send(intr, embed);
    }
}
