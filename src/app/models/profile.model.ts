import { DEVICE_ID_KEY, PROFILE_ID_PREFIX } from "../core/constants/core.constant";
import { IProfile } from "../core/interfaces/app.interface";
import { v4 as uuidv4 } from 'uuid';

function generateRandomString(length: number = 32): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export class Profile implements IProfile {
    profileId: string;
    username?: string;
    bankAccount?: string;
    deviceId: string;

    avatarUrl?: string;

    constructor(username?: string, bankAccount?: string) {
        this.profileId = Profile.generateProfileId();
        this.deviceId = Profile.getDeviceId();
        this.username = username;
        this.bankAccount = bankAccount;

        this.avatarUrl = Profile.generateRandomAvatar();
    }

    private static instance: Profile;
    
    public static getInstance(): Profile {
        if (!Profile.instance) {
            Profile.instance = new Profile();
        }
        return Profile.instance;
    }

    static generateRandomAvatar(): string {
        return `https://api.dicebear.com/5.x/bottts-neutral/svg?seed=${generateRandomString(16)}`
    }

    static generateProfileId(): string {
        return PROFILE_ID_PREFIX + uuidv4();
    }

    static getDeviceId(): string {
        const deviceId = localStorage.getItem(DEVICE_ID_KEY);
        if (!deviceId) {
            const newDeviceId = uuidv4();
            localStorage.setItem(DEVICE_ID_KEY, newDeviceId);
            return newDeviceId;
        }
        return deviceId;
    }

    public saveToLocalStorage(): void {
        this.deviceId = Profile.getDeviceId();
        const profileData = JSON.stringify(this);
        localStorage.setItem(this.deviceId, profileData);
    }

    isComplete(): boolean {
        return Boolean(this.username && this.bankAccount);
    }

    public static loadFromLocalStorage(deviceId: string): Profile | null {
        const profileData = localStorage.getItem(deviceId);
        if (profileData) {
            const data = JSON.parse(profileData);
            const profile = new Profile();
            profile.username = data.username;
            profile.bankAccount = data.bankAccount;
            profile.profileId = data.profileId;
            profile.deviceId = data.deviceId;
            profile.avatarUrl = data.avatarUrl;
            return profile;
        }
        return null;
    }
}