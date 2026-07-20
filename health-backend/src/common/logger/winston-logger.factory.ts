import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';

export function createWinstonLoggerOptions(): winston.LoggerOptions {
  const logDir = process.env.LOG_DIR || './logs';
  const retentionDays = Number(process.env.LOG_RETENTION_DAYS || 7);

  return {
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          nestWinstonModuleUtilities.format.nestLike('health-backend', {
            colors: true,
            prettyPrint: true,
          }),
        ),
      }),
      new winston.transports.DailyRotateFile({
        dirname: logDir,
        filename: '%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxFiles: `${retentionDays}d`,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    ],
  };
}
