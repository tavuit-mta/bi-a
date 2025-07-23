import { inject, Injectable } from '@angular/core';
import { deleteDoc, doc, docData, DocumentData, Firestore, getDoc, onSnapshot, setDoc, updateDoc, WithFieldValue } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { GameService } from './core/services/game.service';
import { GameState } from './models/game-state.model';
import moment from 'moment';
import { FIREBASE_PATH, GAME_STATE_KEY, PATH_KEY, SERVER_KEY } from './core/constants/core.constant'; // Adjust the import path as necessary

@Injectable({
  providedIn: 'root'
})

export class AppService {
  firestore = inject(Firestore);
  gamePath: string = [FIREBASE_PATH, moment().format('YYYY_MM_DD')].join('_');

  constructor() {
  }

  get isServer(): boolean {
    const server = localStorage.getItem(SERVER_KEY);
    return server === 'true';
  }

  getGamePath(): string {
    return localStorage.getItem(PATH_KEY) || '';
  }

  hasStartedGame(): boolean {
    const gamePath = localStorage.getItem(PATH_KEY);
    return Boolean(gamePath);
  }

  storeGamePath(path: string, isServer: boolean): void {
    localStorage.setItem(PATH_KEY, path);
    localStorage.setItem(SERVER_KEY, JSON.stringify(isServer));
  }

  initializeGame(path: string, isJoinGame: boolean = false): Promise<GameState> {
    return new Promise<GameState>((resolve, reject) => {
      const basePath = this.gamePath
      const docRef = doc(this.firestore, basePath, path);
      getDoc(docRef).then(docSnapshot => {                
        if (docSnapshot.exists()) {
          resolve(docSnapshot.data() as GameState);
        } 
        if (!isJoinGame) {
          setDoc(docRef, {} as GameState).then(() => {
            resolve({} as GameState);
          })
        } else {
          reject();
        } 
      })
    });
  }

  getGameData(service: GameService): void {
    const path = localStorage.getItem(PATH_KEY);
    if (!path) {
      throw new Error('Game path not found in local storage');
    }
    const basePath = this.gamePath;
    const documentRef = doc(this.firestore, basePath, path);
    onSnapshot(documentRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as GameState;
        console.log('Received real-time data:', docSnap.data());
        service.pushGameData(data);
        service.saveToStorage();
      }
    });
  }

  getGameDataOnce(): Observable<GameState> {
    const path = localStorage.getItem(PATH_KEY);
    if (!path) {
      throw new Error('Game path not found in local storage');
    }
    const basePath = this.gamePath;
    const documentRef = doc(this.firestore, basePath, path);
    return docData(documentRef) as Observable<GameState>;
  }

  pushGameData(data: WithFieldValue<DocumentData>): Promise<void> {
    console.log('Pushing game data to Firestore:', data);
    
    const path = localStorage.getItem(PATH_KEY);
    if (!path) {
      throw new Error('Game path not found in local storage');
    }
    const basePath = this.gamePath;
    const documentRef = doc(this.firestore, basePath, path);
    return updateDoc(documentRef, data);
  }

  async removeGameData(gameService: GameService): Promise<void> {
    return new Promise<void>((resolve) => {
      localStorage.removeItem(PATH_KEY);
      localStorage.removeItem(SERVER_KEY);
      localStorage.removeItem(GAME_STATE_KEY)
      resolve();
    });
  }

  async deleteGameData(gameService: GameService): Promise<void> {
    const path = localStorage.getItem(PATH_KEY);
    if (!path) {
      throw new Error('Game path not found in local storage');
    }
    const basePath = this.gamePath;
    const documentRef = doc(this.firestore, basePath, path);
    return deleteDoc(documentRef).then(() => {
      this.removeGameData(gameService);
    });
  }

}