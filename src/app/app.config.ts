import { APP_INITIALIZER, ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { environment } from '../environments/environment';
import { DEVICE_ID_KEY } from './core/constants/core.constant';
import { v4 as uuidv4 } from 'uuid';

function initializeDevice(): void {
  // Store deviceID in localStorage if not already present
  if (!localStorage.getItem(DEVICE_ID_KEY)) {
    const deviceID = uuidv4();
    localStorage.setItem(DEVICE_ID_KEY, deviceID);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes), 
    provideAnimationsAsync(), 
    provideFirebaseApp(() => initializeApp(environment.firebase)), 
    provideFirestore(() => getFirestore()),
    {
      provide: APP_INITIALIZER,
      useValue: initializeDevice,
      multi: true
    }
  ]
};
