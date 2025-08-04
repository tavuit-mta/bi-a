export interface Player {
  index: number;
  name: string;
  profileId: string; 
  avatar: string;
  active: boolean;
}

export class PlayerModel implements Player {
  index: number;
  name: string;
  profileId: string; 
  avatar: string;
  active: boolean;

  constructor({index, name, profileId, avatar, active = true}: {index: number, name: string, profileId: string, avatar: string, active?: boolean}) {
    this.index = index;
    this.name = name;
    this.profileId = profileId;
    this.avatar = avatar;
    this.active = active;
  }

  activePlayer(): void {
    this.active = true;
  }

  inactivePlayer(): void {
    this.active = false;
  }

  toJSON(): Player {
    return {
      index: this.index,
      name: this.name,
      profileId: this.profileId,
      avatar: this.avatar,
      active: this.active
    };
  }
}