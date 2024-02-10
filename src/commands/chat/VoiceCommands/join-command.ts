import { getVoiceConnection } from '@discordjs/voice';
import { ChatInputCommandInteraction, GuildMember, PermissionsString } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';
import { createRequire } from 'node:module';

import { VoiceErrors, VoiceInfo } from '../../../enums/index.js';
import { Language } from '../../../models/enum-helpers/index.js';
import { EventData } from '../../../models/internal-models.js';
import { Lang, Logger, VoiceService } from '../../../services/index.js';
import { InteractionUtils } from '../../../utils/index.js';
import { Command, CommandDeferType } from '../../index.js';

const require = createRequire(import.meta.url);
let Config = require('../../../../config/config.json');

export class JoinCommand implements Command {
    public names = [Lang.getRef('chatCommands.join', Language.Default)];
    public cooldown = new RateLimiter(1, 5000);
    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        const { guildId, guild, member } = intr;
        const { voice, displayName } = member as GuildMember;
        const command = intr.commandName;

        const channelId = voice?.channelId;
        const adapterCreator = guild.voiceAdapterCreator;

        if (!channelId) {
            await InteractionUtils.send(
                intr,
                Lang.getEmbed('displayEmbeds.userNotConnected', data.lang, {
                    user: displayName,
                })
            );
            Logger.error(VoiceErrors.USER_NOT_CONNECTED, { command });
            return;
        }

        const bot = await guild.members.fetch(Config.client.id);
        if (!voice.channel.permissionsFor(bot).has('Connect')) {
            await InteractionUtils.send(
                intr,
                Lang.getEmbed('displayEmbeds.missingPermToJoinVC', data.lang, {
                    channel: voice.channel.name,
                })
            );
            Logger.error(VoiceErrors.MISSING_CONNECT_PERMS, { command });
            return;
        }

        const conn = getVoiceConnection(guildId);
        if (conn) conn.destroy();

        await VoiceService.joinVoice({ channelId, adapterCreator, guildId });
        await InteractionUtils.send(
            intr,
            Lang.getEmbed('displayEmbeds.joinVC', data.lang, {
                channel: voice.channel.name,
            })
        );
        Logger.info(VoiceInfo.SUCCESSFUL_JOIN, {
            guildId,
            channelId,
        });
    }
}
