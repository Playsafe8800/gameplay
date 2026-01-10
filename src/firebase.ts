import firebase from 'firebase-admin';
import serviceAccount from './firebase.json';
import { BOT_CONFIG } from './constants';

class Firebase {
  app;
  config;
  constructor() {
    this.app = firebase.remoteConfig(
      firebase.initializeApp({
        credential: firebase.credential.cert(serviceAccount as any),
      }),
    );
  }

  async init() {
    this.config = (
      await this.app.getServerTemplate({ defaultConfig: BOT_CONFIG })
    ).evaluate();
  }
}

export const FirebaseConfig = new Firebase();
