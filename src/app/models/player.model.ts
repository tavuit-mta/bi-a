export interface Player {
  id: number;
  name: string;
  profileId: string; 
  avatar: string;
  active: boolean;
}

export class PlayerModel implements Player {
  id: number;
  name: string;
  profileId: string; 
  avatar: string;
  active: boolean;

  constructor(id: number, name: string, profileId: string, avatar: string, active: boolean = true) {
    this.id = id;
    this.name = name;
    this.profileId = profileId;
    this.avatar = avatar;
    this.active = active;
  }
}