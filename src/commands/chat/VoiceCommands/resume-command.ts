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

export class ResumeCommand implements Command {
    public names = [Lang.getRef('chatCommands.resume', Language.Default)];
    public cooldown = new RateLimiter(1, 5000);
    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        const { guildId, guild, member } = intr;

        if (!guild || !guildId) {
            InteractionUtils.send(
                intr,
                Lang.getEmbed('displayEmbeds.dmCommandUsageError', data.lang)
            );
            return;
        }

        const { channelId: botChannelId } = (await guild.members.fetch(Config.client.id)).voice;
        const command = intr.commandName;

        if (!botChannelId) {
            InteractionUtils.send(intr, Lang.getEmbed('displayEmbeds.botNotConnected', data.lang));
            Logger.error(VoiceErrors.BOT_NOT_CONNECTED, { command });
            return;
        }

        const { voice, displayName } = member as GuildMember;
        const { channelId } = voice;
        if (!channelId) {
            InteractionUtils.send(
                intr,
                Lang.getEmbed('displayEmbeds.userNotConnected', data.lang, { user: displayName })
            );
            Logger.error(VoiceErrors.USER_NOT_CONNECTED, { command });
            return;
        }

        if (botChannelId !== channelId) {
            InteractionUtils.send(
                intr,
                Lang.getEmbed('displayEmbeds.differentVC', data.lang, { user: displayName })
            );
            Logger.error(VoiceErrors.USER_IN_DIFFERENT_CHANNEL, { command });
            return;
        }

        let embed: EmbedBuilder;
        if (await voiceServiceInstance.resume(guildId)) {
            embed = Lang.getEmbed('displayEmbeds.resumed', data.lang);
            Logger.info(VoiceInfo.SUCCESSFUL_RESUME);
        } else {
            embed = Lang.getEmbed('displayEmbeds.resumeFailure', data.lang);
            Logger.error(VoiceErrors.RESUME_FAILURE);
        }
        await InteractionUtils.send(intr, embed);
    }
}
