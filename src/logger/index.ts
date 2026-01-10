import winston from 'winston';

const Logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'gameplay-service' },
  transports: [new winston.transports.Console()],
});

// if (process.env.NODE_ENV === 'production') {
Logger.add(
  new winston.transports.Console({
    format: winston.format.simple(),
  }),
);
// }

export default Logger;
