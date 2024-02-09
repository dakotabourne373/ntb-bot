import {
    ApplicationCommandType,
    PermissionFlagsBits,
    PermissionsBitField,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
    RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from 'discord.js';

import { Args } from './index.js';
import { Language } from '../models/enum-helpers/index.js';
import { Lang } from '../services/index.js';

export const ChatCommandMetadata: {
    [command: string]: RESTPostAPIChatInputApplicationCommandsJSONBody;
} = {
    DEV: {
        type: ApplicationCommandType.ChatInput,
        name: Lang.getRef('chatCommands.dev', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('chatCommands.dev'),
        description: Lang.getRef('commandDescs.dev', Language.Default),
        description_localizations: Lang.getRefLocalizationMap('commandDescs.dev'),
        dm_permission: true,
        default_member_permissions: PermissionsBitField.resolve([
            PermissionFlagsBits.Administrator,
        ]).toString(),
        options: [
            {
                ...Args.DEV_COMMAND,
                required: true,
            },
        ],
    },
    HELP: {
        type: ApplicationCommandType.ChatInput,
        name: Lang.getRef('chatCommands.help', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('chatCommands.help'),
        description: Lang.getRef('commandDescs.help', Language.Default),
        description_localizations: Lang.getRefLocalizationMap('commandDescs.help'),
        dm_permission: true,
        default_member_permissions: undefined,
        options: [
            {
                ...Args.HELP_OPTION,
                required: true,
            },
        ],
    },
    INFO: {
        type: ApplicationCommandType.ChatInput,
        name: Lang.getRef('chatCommands.info', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('chatCommands.info'),
        description: Lang.getRef('commandDescs.info', Language.Default),
        description_localizations: Lang.getRefLocalizationMap('commandDescs.info'),
        dm_permission: true,
        default_member_permissions: undefined,
        options: [
            {
                ...Args.INFO_OPTION,
                required: true,
            },
        ],
    },
    TEST: {
        type: ApplicationCommandType.ChatInput,
        name: Lang.getRef('chatCommands.test', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('chatCommands.test'),
        description: Lang.getRef('commandDescs.test', Language.Default),
        description_localizations: Lang.getRefLocalizationMap('commandDescs.test'),
        dm_permission: true,
        default_member_permissions: undefined,
    },
    PLAY: {
        type: ApplicationCommandType.ChatInput,
        name: Lang.getRef('chatCommands.play', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('chatCommands.play'),
        description: Lang.getRef('commandDescs.play', Language.Default),
        description_localizations: Lang.getRefLocalizationMap('commandDescs.play'),
        dm_permission: true,
        default_member_permissions: undefined,
        options: [
            {
                ...Args.VOICE_OPTION_PLAY,
            },
        ],
    },
    JOIN: {
        type: ApplicationCommandType.ChatInput,
        name: Lang.getRef('chatCommands.join', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('chatCommands.join'),
        description: Lang.getRef('commandDescs.join', Language.Default),
        description_localizations: Lang.getRefLocalizationMap('commandDescs.join'),
        dm_permission: true,
        default_member_permissions: undefined,
    },
    LEAVE: {
        type: ApplicationCommandType.ChatInput,
        name: Lang.getRef('chatCommands.leave', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('chatCommands.leave'),
        description: Lang.getRef('commandDescs.leave', Language.Default),
        description_localizations: Lang.getRefLocalizationMap('commandDescs.leave'),
        dm_permission: true,
        default_member_permissions: undefined,
    },
    SKIP: {
        type: ApplicationCommandType.ChatInput,
        name: Lang.getRef('chatCommands.skip', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('chatCommands.skip'),
        description: Lang.getRef('commandDescs.skip', Language.Default),
        description_localizations: Lang.getRefLocalizationMap('commandDescs.skip'),
        dm_permission: true,
        default_member_permissions: undefined,
    },
    QUEUE: {
        type: ApplicationCommandType.ChatInput,
        name: Lang.getRef('chatCommands.queue', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('chatCommands.queue'),
        description: Lang.getRef('commandDescs.skip', Language.Default),
        description_localizations: Lang.getRefLocalizationMap('commandDescs.skip'),
        dm_permission: true,
        default_member_permissions: undefined,
        options: [{ ...Args.QUEUE_OPTION_SHOW }, { ...Args.QUEUE_OPTION_CLEAR }],
    },
    PAUSE: {
        type: ApplicationCommandType.ChatInput,
        name: Lang.getRef('chatCommands.pause', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('chatCommands.pause'),
        description: Lang.getRef('commandDescs.pause', Language.Default),
        description_localizations: Lang.getRefLocalizationMap('commandDescs.pause'),
        dm_permission: true,
        default_member_permissions: undefined,
    },
    RESUME: {
        type: ApplicationCommandType.ChatInput,
        name: Lang.getRef('chatCommands.resume', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('chatCommands.resume'),
        description: Lang.getRef('commandDescs.resume', Language.Default),
        description_localizations: Lang.getRefLocalizationMap('commandDescs.resume'),
        dm_permission: true,
        default_member_permissions: undefined,
    },
};

export const MessageCommandMetadata: {
    [command: string]: RESTPostAPIContextMenuApplicationCommandsJSONBody;
} = {
    VIEW_DATE_SENT: {
        type: ApplicationCommandType.Message,
        name: Lang.getRef('messageCommands.viewDateSent', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('messageCommands.viewDateSent'),
        default_member_permissions: undefined,
        dm_permission: true,
    },
};

export const UserCommandMetadata: {
    [command: string]: RESTPostAPIContextMenuApplicationCommandsJSONBody;
} = {
    VIEW_DATE_JOINED: {
        type: ApplicationCommandType.User,
        name: Lang.getRef('userCommands.viewDateJoined', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('userCommands.viewDateJoined'),
        default_member_permissions: undefined,
        dm_permission: true,
    },
};
