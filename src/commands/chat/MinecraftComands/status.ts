import { ChatInputCommandInteraction, Colors, PermissionsString } from 'discord.js';

import { MinecraftErrors, STATUS_SUCCESS } from '../../../enums/index.js';
import { Language } from '../../../models/enum-helpers/language.js';
import { EventData } from '../../../models/internal-models.js';
import { StatusResponse } from '../../../models/mc-status.js';
import { HttpService, Logger } from '../../../services/index.js';
import { Lang } from '../../../services/lang.js';
import { InteractionUtils } from '../../../utils/interaction-utils.js';
import { Command, CommandDeferType } from '../../command.js';

enum StatusCommands {
    VANILLA = 'vanilla',
    MODDED = 'modded',
}

export class StatusCommand implements Command {
    public names = [Lang.getRef('chatCommands.status', Language.Default)];
    public deferType = CommandDeferType.HIDDEN;
    public requireClientPerms: PermissionsString[] = [];
    private httpService: HttpService;

    constructor() {
        this.httpService = new HttpService();
    }

    public async execute(intr: ChatInputCommandInteraction, eventData: EventData): Promise<void> {
        const command = intr.options.getSubcommand() as StatusCommands;
        const port = command === StatusCommands.MODDED ? '' : ':25566';
        const serverUrl = `ntbgames.us${port}`;

        const resp = await this.httpService.get(
            `https://api.mcstatus.io/v2/status/java/${serverUrl}`,
            ''
        );
        if (!resp.ok) {
            InteractionUtils.send(
                intr,
                Lang.getEmbed('displayEmbeds.serverStatusError', eventData.lang)
            );
            Logger.error(MinecraftErrors.ERROR_FETCHING_STATUS, {
                statusCode: resp.status,
                error: await resp.text(),
            });
        }

        const data = (await resp.json()) as StatusResponse;

        const { motd, online, players } = data;

        const embed = Lang.getEmbed('displayEmbeds.serverStatus', eventData.lang, {
            url: serverUrl,
        }).setImage(`https://api.mcstatus.io/v2/widget/java/${serverUrl}`);

        if (online) {
            const { online = 0, max = 0, list = [] } = players || {};
            const { clean = 'A Minecraft Server' } = motd || {};
            embed
                .setDescription(clean)
                .setColor(Colors.Green)
                .addFields([
                    {
                        name: 'Status',
                        value: '🟢 Online',
                    },
                    {
                        name: 'Players Online',
                        value: online ? list.join('\n') : 'N/A',
                        inline: true,
                    },
                    {
                        name: 'Total Players Online',
                        value: online.toString(),
                        inline: true,
                    },
                    {
                        name: 'Max Players',
                        value: max.toString(),
                        inline: true,
                    },
                ]);
        } else {
            embed.setColor(Colors.DarkRed).addFields([
                {
                    name: 'Status',
                    value: '🔴 Offline',
                },
            ]);
        }

        InteractionUtils.send(intr, embed);
        Logger.info(STATUS_SUCCESS);
    }
}
