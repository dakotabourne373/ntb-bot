import { Message } from 'discord.js';

import { Trigger } from './trigger.js';
import { EventData } from '../models/internal-models.js';
import { Lang, Logger } from '../services/index.js';

export class BanWaldenTrigger implements Trigger {
    requireGuild = true;
    blockList = new Map<string, string[]>();

    public triggered(msg: Message): boolean {
        const { member, guildId } = msg;

        if (!member || !guildId) {
            return false;
        }

        const blockList = this.blockList.get(guildId) || ['873541259774525520'];
//        return blockList.includes(member.id);
return false;
    }

    public async execute(msg: Message, data: EventData): Promise<void> {
        const { member } = msg;

        if (!member) {
            // TO-DO: Add error log as necessary
            return;
        }

        Logger.info('Timing user out', { user: member.displayName });

        member.timeout(60000, 'teehee');
        const reply = await msg.reply(Lang.getRef('meta.timeout', data.lang));
        setTimeout(() => reply.delete(), 60000);
        msg.delete();
    }
}
