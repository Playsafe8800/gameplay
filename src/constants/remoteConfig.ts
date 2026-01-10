import { FirebaseConfig } from '../firebase';

class Config {
  getNumber(keyName: string) {
    return FirebaseConfig.config.getNumber(`${keyName}`);
  }

  getBoolean(keyName: string) {
    return FirebaseConfig.config.getBoolean(`${keyName}`);
  }
  getString(keyName: string) {
    return FirebaseConfig.config.getString(`${keyName}`);
  }

  getJsonValue(keyName: string) {
    return JSON.parse(FirebaseConfig.config.getString(`${keyName}`))
  }
}

export const RemoteConfig = new Config();
