export interface StatusResponse {
    online: boolean;
    host: string;
    port: number;
    ip_address: string;
    eula_blocked: boolean;
    retrieved_at: number;
    expires_at: number;
    srv_record: any;
    version?: {
        name_raw: string;
        name_clean: string;
        name_html: string;
        protocol: number;
    };
    players?: {
        online: number;
        max: number;
        list: string[];
    };
    motd?: {
        raw: string;
        clean: string;
        html: string;
    };
    icon?: string | null;
    mods?: any[];
    software?: any;
    plugins?: any[];
}
