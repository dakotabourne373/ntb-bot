export const YOUTUBE_REGEX =
    /^(?:https?:\/\/)?(?:(www|music)\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[&?].*)?$/;
const YOUTUBE_MUSIC_REGEX =
    /^(?:https?:\/\/)?(?:music\.)(?:youtube\.com\/(?:watch\?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})(?:[&?].*)?$/;
const YOUTUBE_ONLY_REGEX =
    /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[&?].*)?$/;

export class RegexUtils {
    public static regex(input: string): RegExp | undefined {
        let match = input.match(/^\/(.*)\/([^/]*)$/);
        if (!match) {
            return;
        }

        return new RegExp(match[1], match[2]);
    }

    public static escapeRegex(input: string): string {
        return input?.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    }

    public static discordId(input?: string): string | undefined {
        return input?.match(/\b\d{17,20}\b/)?.[0];
    }

    public static tag(
        input: string
    ): { username: string; tag: string; discriminator: string } | undefined {
        let match = input.match(/\b(.+)#([\d]{4})\b/);
        if (!match) {
            return;
        }

        return {
            tag: match[0],
            username: match[1],
            discriminator: match[2],
        };
    }

    public static youtubeLink(input: string): 'music' | 'regular' | null {
        let returnType = null;
        if (YOUTUBE_MUSIC_REGEX.test(input)) returnType = 'music' as const;
        else if (YOUTUBE_ONLY_REGEX.test(input)) returnType = 'regular' as const;
        return returnType;
    }

    public static extractYoutubeVideoId(input: string): string | null {
        const match = input.match(YOUTUBE_ONLY_REGEX);
        return match?.[1] ?? null;
    }
}
