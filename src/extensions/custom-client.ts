import { ActivityType, Client, ClientOptions, ClientUser, Presence } from 'discord.js';

export class CustomClient extends Client {
    constructor(clientOptions: ClientOptions) {
        super(clientOptions);
    }

    public setPresence(type: ActivityType, name: string, url: string): Presence {
        return (this.user as ClientUser)?.setPresence({
            activities: [
                {
                    type,
                    name,
                    url,
                },
            ],
        });
    }
}
