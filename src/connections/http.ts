import http from 'http';
import app from './express';

const server: http.Server = http.createServer(app);

export default server;
