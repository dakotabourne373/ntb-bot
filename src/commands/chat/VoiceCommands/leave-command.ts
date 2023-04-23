import { ChatInputCommandInteraction, PermissionsString } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';
import { createRequire } from 'node:module';

import { Language } from '../../../models/enum-helpers/index.js';
import { EventData } from '../../../models/internal-models.js';
import { Lang, voiceServiceInstance } from '../../../services/index.js';
import { InteractionUtils } from '../../../utils/index.js';
import { Command, CommandDeferType } from '../../index.js';

const require = createRequire(import.meta.url);
let Config = require('../../../../config/config.json');

export class LeaveCommand implements Command {
    public names = [Lang.getRef('chatCommands.leave', Language.Default)];
    public cooldown = new RateLimiter(1, 5000);
    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        const { guildId, guild } = intr;
        const { channelId: botChannelId, channel } = (await guild.members.fetch(Config.client.id))
            .voice;

        if (!botChannelId) {
            InteractionUtils.send(intr, Lang.getEmbed('displayEmbeds.botNotConnected', data.lang));
            return;
        }

        InteractionUtils.send(
            intr,
            Lang.getEmbed('displayEmbeds.leavingVC', data.lang, {
                channel: channel.name,
            })
        );
        voiceServiceInstance.leaveVoice(guildId);
    }
}
