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
import { Lang, voiceServiceInstance } from '../../../services/index.js';
import { InteractionUtils } from '../../../utils/index.js';
import { Command, CommandDeferType } from '../../index.js';

const require = createRequire(import.meta.url);
let Config = require('../../../../config/config.json');

export class SkipCommand implements Command {
    public names = [Lang.getRef('chatCommands.skip', Language.Default)];
    public cooldown = new RateLimiter(1, 5000);
    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        const { guildId, guild, member } = intr;
        const { channelId: botChannelId } = (await guild.members.fetch(Config.client.id)).voice;
        const { voice, displayName } = member as GuildMember;

        const { channelId } = voice;

        if (!botChannelId) {
            InteractionUtils.send(intr, Lang.getEmbed('displayEmbeds.botNotConnected', data.lang));
            return;
        }

        if (!channelId) {
            InteractionUtils.send(
                intr,
                Lang.getEmbed('displayEmbeds.userNotConnected', data.lang, { user: displayName })
            );
            return;
        }

        if (botChannelId !== channelId) {
            InteractionUtils.send(
                intr,
                Lang.getEmbed('displayEmbeds.differentVC', data.lang, { user: displayName })
            );
            return;
        }

        let embed: EmbedBuilder = voiceServiceInstance.skip(guildId)
            ? Lang.getEmbed('displayEmbeds.skippingVideo', data.lang)
            : Lang.getEmbed('displayEmbeds.emptyQueue', data.lang);

        InteractionUtils.send(intr, embed);
    }
}
