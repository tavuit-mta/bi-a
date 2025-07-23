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

  constructor({id, name, profileId, avatar, active = true}: {id: number, name: string, profileId: string, avatar: string, active?: boolean}) {
    this.id = id;
    this.name = name;
    this.profileId = profileId;
    this.avatar = avatar;
    this.active = active;
  }

  changeStatus(): void {
    this.active = !this.active;
  }

  toJSON(): Player {
    return {
      id: this.id,
      name: this.name,
      profileId: this.profileId,
      avatar: this.avatar,
      active: this.active
    };
  }
}