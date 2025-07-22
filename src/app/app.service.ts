import { inject, Injectable } from '@angular/core';
import { deleteDoc, doc, docData, DocumentData, Firestore, getDoc, onSnapshot, setDoc, updateDoc, WithFieldValue } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { GameService } from './core/services/game.service';
import { GameState } from './models/game-state.model';
import moment from 'moment';
@Injectable({
  providedIn: 'root'
})
export class AppService {
  firestore = inject(Firestore);
  gamePath: string = 'BILLIARD_SCORE_' + moment().format('YYYY_MM_DD');

  PATH_KEY = 'BILLIARD_SCORE_PATH';
  SERVER_KEY = 'BILLIARD_SCORE_SERVER';

  constructor() {
  }

  get isServer(): boolean {
    const server = localStorage.getItem(this.SERVER_KEY);
    return server === 'true';
  }

  getGamePath(): string {
    return localStorage.getItem(this.PATH_KEY) || '';
  }

  hasStartedGame(): boolean {
    const gamePath = localStorage.getItem(this.PATH_KEY);
    return Boolean(gamePath);
  }

  storeGamePath(path: string, isServer: boolean): void {
    localStorage.setItem(this.PATH_KEY, path);
    localStorage.setItem(this.SERVER_KEY, JSON.stringify(isServer));
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
    const path = localStorage.getItem(this.PATH_KEY);
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
      }
    });
  }

  getGameDataOnce(): Observable<GameState> {
    const path = localStorage.getItem(this.PATH_KEY);
    if (!path) {
      throw new Error('Game path not found in local storage');
    }
    const basePath = this.gamePath;
    const documentRef = doc(this.firestore, basePath, path);
    return docData(documentRef) as Observable<GameState>;
  }

  pushGameData(data: WithFieldValue<DocumentData>): Promise<void> {
    const path = localStorage.getItem(this.PATH_KEY);
    if (!path) {
      throw new Error('Game path not found in local storage');
    }
    const basePath = this.gamePath;
    const documentRef = doc(this.firestore, basePath, path);
    return updateDoc(documentRef, data);
  }

  async removeGameData(gameService: GameService): Promise<void> {
    return new Promise<void>((resolve) => {
       localStorage.removeItem(this.PATH_KEY);
       localStorage.removeItem(this.SERVER_KEY);
       gameService.pushGameData({ players: [], results: [] });
       resolve();
    });
  }

  async deleteGameData(gameService: GameService): Promise<void> {
    const path = localStorage.getItem(this.PATH_KEY);
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