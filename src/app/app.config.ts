import { APP_INITIALIZER, ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { environment } from '../environments/environment';
import { DEVICE_ID_KEY } from './core/constants/core.constant';
import { v4 as uuidv4 } from 'uuid';
import { provideHttpClient } from '@angular/common/http';
import { Device } from '@capacitor/device';

async function initializeDevice(): Promise<void> {
  if (!localStorage.getItem(DEVICE_ID_KEY)) {
    const deviceID = await Device.getId();
    console.log('Device Info:', deviceID);
    localStorage.setItem(DEVICE_ID_KEY, deviceID.identifier);
  }
  return Promise.resolve();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes), 
    provideAnimationsAsync(), 
    provideHttpClient(),
    provideFirebaseApp(() => initializeApp(environment.firebase)), 
    provideFirestore(() => getFirestore()),
    {
      provide: APP_INITIALIZER,
      useValue: initializeDevice,
      multi: true
    }
  ]
};
