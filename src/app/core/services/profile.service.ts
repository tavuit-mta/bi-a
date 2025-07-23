import { Injectable } from "@angular/core";
import { Profile } from "../../models/profile.model";
import { Observable, Subject } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
    profile$: Subject<Profile> = new Subject<Profile>();
    public isCompleteProfile: boolean = false;

    constructor() {
        
    }

    public setIsCompleteProfile(value: boolean) {
        this.isCompleteProfile = value;
    }

    public getProfile(): Observable<Profile> {
        return this.profile$.asObservable();
    }

    public updateProfile(profile: Profile): void {
        this.profile$.next(profile);
    }

    public loadProfile(): void {
        console.log('Loading profile from local storage...');
        const deviceId = Profile.getDeviceId();
        const profile = Profile.loadFromLocalStorage(deviceId);
        if (profile) {
            this.profile$.next(profile);
            this.isCompleteProfile = profile.isComplete();
        } else {
            this.isCompleteProfile = false;
        }
    }
}