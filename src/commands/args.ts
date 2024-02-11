import {
    APIApplicationCommandBasicOption,
    APIApplicationCommandOption,
    ApplicationCommandOptionType,
} from 'discord.js';

import { DevCommandName, HelpOption, InfoOption } from '../enums/index.js';
import { Language } from '../models/enum-helpers/index.js';
import { Lang } from '../services/index.js';

export class Args {
    public static readonly DEV_COMMAND: APIApplicationCommandBasicOption = {
        name: Lang.getRef('arguments.command', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('arguments.command'),
        description: Lang.getRef('argDescs.devCommand', Language.Default),
        description_localizations: Lang.getRefLocalizationMap('argDescs.devCommand'),
        type: ApplicationCommandOptionType.String,
        choices: [
            {
                name: Lang.getRef('devCommandNames.info', Language.Default),
                name_localizations: Lang.getRefLocalizationMap('devCommandNames.info'),
                value: DevCommandName.INFO,
            },
        ],
    };
    public static readonly HELP_OPTION: APIApplicationCommandBasicOption = {
        name: Lang.getRef('arguments.option', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('arguments.option'),
        description: Lang.getRef('argDescs.helpOption', Language.Default),
        description_localizations: Lang.getRefLocalizationMap('argDescs.helpOption'),
        type: ApplicationCommandOptionType.String,
        choices: [
            {
                name: Lang.getRef('helpOptionDescs.contactSupport', Language.Default),
                name_localizations: Lang.getRefLocalizationMap('helpOptionDescs.contactSupport'),
                value: HelpOption.CONTACT_SUPPORT,
            },
            {
                name: Lang.getRef('helpOptionDescs.commands', Language.Default),
                name_localizations: Lang.getRefLocalizationMap('helpOptionDescs.commands'),
                value: HelpOption.COMMANDS,
            },
        ],
    };
    public static readonly INFO_OPTION: APIApplicationCommandBasicOption = {
        name: Lang.getRef('arguments.option', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('arguments.option'),
        description: Lang.getRef('argDescs.helpOption', Language.Default),
        description_localizations: Lang.getRefLocalizationMap('argDescs.helpOption'),
        type: ApplicationCommandOptionType.String,
        choices: [
            {
                name: Lang.getRef('infoOptions.about', Language.Default),
                name_localizations: Lang.getRefLocalizationMap('infoOptions.about'),
                value: InfoOption.ABOUT,
            },
            {
                name: Lang.getRef('infoOptions.translate', Language.Default),
                name_localizations: Lang.getRefLocalizationMap('infoOptions.translate'),
                value: InfoOption.TRANSLATE,
            },
            {
                name: Lang.getRef('infoOptions.dev', Language.Default),
                name_localizations: Lang.getRefLocalizationMap('infoOptions.dev'),
                value: InfoOption.DEV,
            },
        ],
    };
    public static readonly VOICE_OPTION_PLAY: APIApplicationCommandBasicOption = {
        name: Lang.getRef('voiceOptions.play', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('voiceOptions.play'),
        description: Lang.getRef('argDescs.voiceOption', Language.Default),
        description_localizations: Lang.getRefLocalizationMap('argDescs.voiceOption'),
        type: ApplicationCommandOptionType.String,
        required: true,
    };
    public static readonly QUEUE_OPTION_SHOW: APIApplicationCommandOption = {
        name: Lang.getRef('voiceOptions.show', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('voiceOptions.show'),
        description: Lang.getRef('argDescs.showQueueOption', Language.Default),
        description_localizations: Lang.getRefLocalizationMap('argDescs.showQueueOption'),
        type: ApplicationCommandOptionType.Subcommand,
    };
    public static readonly QUEUE_OPTION_CLEAR: APIApplicationCommandOption = {
        name: Lang.getRef('voiceOptions.clear', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('voiceOptions.clear'),
        description: Lang.getRef('argDescs.clearQueueOption', Language.Default),
        description_localizations: Lang.getRefLocalizationMap('argDescs.clearQueueOption'),
        type: ApplicationCommandOptionType.Subcommand,
    };
    public static readonly STATUS_OPTION_VANILLA: APIApplicationCommandOption = {
        name: Lang.getRef('voiceOptions.vanilla', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('voiceOptions.vanilla'),
        description: Lang.getRef('argDescs.vanillaStatusOption', Language.Default),
        description_localizations: Lang.getRefLocalizationMap('argDescs.vanillaStatusOption'),
        type: ApplicationCommandOptionType.Subcommand,
    };
    public static readonly STATUS_OPTION_MODDED: APIApplicationCommandOption = {
        name: Lang.getRef('voiceOptions.modded', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('voiceOptions.modded'),
        description: Lang.getRef('argDescs.moddedStatusOption', Language.Default),
        description_localizations: Lang.getRefLocalizationMap('argDescs.moddedStatusOption'),
        type: ApplicationCommandOptionType.Subcommand,
    };
}
