import express, { Request, Response, Router } from 'express';
import { Logger } from '../newLogger';
import axios from 'axios'
import { Initializer } from '../services/schedulerQueue/init';
import rdsOps from "../connections/redis"
import socketOps from "../connections/socket"

class RouterClass {
  router: Router;
  constructor() {
    this.router = express.Router();
    this.router.get('/healthcheck', this.HealthCheck);
    this.router.get('/shutdown', this.ShutDown);

    this.router.get('/', (_req: Request, res: Response) => {
      res.status(200).json('It Works...  ;)');
    });

    this.router.get(
      '/update/config',
      (_req: Request, res: Response) => {
        res.status(200).json('config updated ...  ;)');
      },
    );

    this.router.get('/test', (req: Request, res: Response) => {
      res.send('Http server is working...');
    });
  }

  private HealthCheck = async (req: Request, res: Response) => {
    try {
      const apiResponse = await axios.get('http://127.0.0.1:3001/healthcheck');
      if (apiResponse.status === 200) {
        const response = {
          message: 'OK',
          identity: process.pid,
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        };
        res.status(200).json(response);
      } else {
        res.status(503).json({ error: true, message: 'External service unavailable' });
      }
    } catch (error) {
      res.status(403).json({
        error: true,
        message: `${error}`,
        timestamp: new Date().toISOString(),
      });
    }
  };

  private ShutDown = async (req: Request, res: Response) => {
    try {
      await Initializer.shutdownQueues()
      await new Promise((resolve, reject) => {
        rdsOps.queryClient.quit((error, reply) => {
          if (error) Logger.error('redis shutdown error', error.message);
          else Logger.info('Redis connections closed.');

          socketOps.socketClient.close((err) => {
            if (err) Logger.error('socket shutdown error', err.message);
            else Logger.info('socket connections closed.');
            resolve(true)
          });
        });
      })
      res.status(200).json({ status: 'ok' });
    } catch (error: any) {
      Logger.error(`INTERNAL_SERVER_ERROR Exception in shutdown hook`, [error]);
      res
        .status(400)
        .json({ status: 'BadRequest', error: error.message });
    } finally {
      process.exit(0);
    }
  };
}

export default new RouterClass().router;
