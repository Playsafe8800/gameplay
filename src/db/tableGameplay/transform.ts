import { Logger } from '../../newLogger';

class TransformTableGameplay {
  transformTableGameplay(tableGameplayObj: any) {
    const finalGameplayObj = tableGameplayObj;
    try {
      Object.keys(tableGameplayObj).forEach((tgp) => {
        const value = finalGameplayObj[tgp];
        if (typeof value === 'string') {
          finalGameplayObj[tgp] = value;
        } else {
          finalGameplayObj[tgp] = JSON.parse(value);
        }
      });
      return finalGameplayObj;
    } catch (err: any) {
      Logger.error(`INTERNAL_SERVER_ERROR ${err}`);
      return finalGameplayObj;
    }
  }
}

const transform = new TransformTableGameplay();
export = transform;
