import express, { Request, Application, Response } from 'express';

import router from '../routes';

class ExpressServer {
  app: Application;

  constructor() {
    this.app = express();
    /*
     * parsing body data request
     */
    // parse application/x-www-form-urlencoded
    this.app.use(
      express.urlencoded({
        limit: '50mb',
        extended: false,
        parameterLimit: 1000,
      }),
    );

    // parse application/json
    this.app.use(express.json({ limit: '50mb' }));

    this.app.use((_req: Request, res: Response, next: () => void) => {
      // Website you wish to allow to connect
      res.setHeader('Access-Control-Allow-Origin', '*');

      // Request methods you wish to allow
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, OPTIONS, PUT, PATCH, DELETE',
      );

      // Request headers you wish to allow
      res.setHeader(
        'Access-Control-Allow-Headers',
        'X-Requested-With,content-type',
      );

      // Set to true if you need the website to include cookies in the requests sent
      // to the API (e.g. in case you use sessions)
      res.setHeader('Access-Control-Allow-Credentials', 'true');

      // Pass to next layer of middleware
      next();
    });

    // All index route will be handled here
    this.app.use('/', router);
  }
}

export default new ExpressServer().app;
