import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';

// Sets up Winston logger with console output and NestJS formatting
export const loggerOptions = (applicationName: string) => {
  return {
    transports: [
      new winston.transports.Console({
        level: process.env.LOG_LEVEL || 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          nestWinstonModuleUtilities.format.nestLike(applicationName, {
            prettyPrint: false,
            colors: true,
          }),
        ),
        // Disable logging during tests
        silent: process.env.NODE_ENV === 'test',
      }),
    ],
  };
};

// Structured context for Winston logs with class and method names
export function createContextWinston(
  constructorName: string,
  functionName: string,
) {
  return {
    context: `${constructorName}.${functionName}`,
    labels: {
      app: process.env.APPLICATION_NAME,
      module: constructorName,
      function: functionName,
    },
  };
}
