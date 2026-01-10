import moment from 'moment';
class DateUtils {
  addEpochTimeInSeconds(timer: number) {
    const time = moment().add(timer, 's');
    return String(time.valueOf());
  }

  getCurrentEpochTime() {
    return String(new Date().valueOf());
  }
}

export const dateUtils = new DateUtils();
