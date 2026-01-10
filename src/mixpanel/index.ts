import Mixpanel from 'mixpanel'
import logger from '../logger'
const { GAMEPLAY_MIXPANEL_TOKEN } = process.env;

let mixpanel;
if (GAMEPLAY_MIXPANEL_TOKEN){
  mixpanel = Mixpanel.init(GAMEPLAY_MIXPANEL_TOKEN, {
    keepAlive: false,
  });
}

function addMixpanelEvent(event, data) {
  // @ts-ignore
  mixpanel.track(event, data, function (err, dataRes) {
    if (err) {
      logger.error(`INTERNAL_SERVER_ERROR MIXPANEL_ERROR: event ${event} `, [err]);
    }
    logger.info(`MIXPANEL: Event ${event} sent, `, [data]);
  });
}

export default addMixpanelEvent
