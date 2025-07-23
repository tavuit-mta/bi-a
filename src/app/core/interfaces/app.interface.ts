export interface IProfile {
    profileId: string;
    username?: string;
    bankAccount?: string;
    deviceId: string;
    /**
     * URL of the avatar image.
     * Optional, as it may not be set initially.
     */
    avatarUrl?: string;
}