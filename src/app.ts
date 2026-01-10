require('newrelic');
import MODULE_CONFIG from './config/module';
import httpServer from './connections/http';

import { redlock } from './utils/lock/redlock';
import { Logger } from './newLogger';
import rdsOps from './connections/redis';
import socketOps from './connections/socket';
const { HTTP_SERVER_PORT, SERVER_TYPE } = MODULE_CONFIG;
import { FirebaseConfig } from './firebase';

(async () => {
  try {
    await Logger.initializeLogger();
    await FirebaseConfig.init();
    const [redisClient] = await Promise.all([
      rdsOps.init(),
      socketOps.createSocketServer(),
    ]);
    await redlock.init(redisClient);
    httpServer.listen(HTTP_SERVER_PORT, () => {
      Logger.info(
        `${SERVER_TYPE} Server listening to the port ${HTTP_SERVER_PORT}`,
      );
    });

    httpServer.on('error', (e) => {
      Logger.error('HTTP ERROR: ', e);
    });

  } catch (error: any) {
    Logger.error(`Server listen error`, error);
  }
})();

process
  .on('unhandledRejection', (error) => {
    Logger.error(
      `Unhandled Rejection at Promise: ${error}, @ ${new Date().toLocaleString()} \n`,
    );
  })
  .on('uncaughtException', (error: Error) => {
    Logger.error(
      `Uncaught Exception thrown at ${new Date().toLocaleString()} \n`,
      error,
    );
  });

process.on('message', async (packet: any) => {
  Logger.info(`Received cleanup request`, packet);
  // Disconnection Handler
  if (packet?.data?.reason === 'deployment') {
    // cleanup here
  }
});


