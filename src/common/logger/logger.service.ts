import { ConsoleLogger, Injectable, Scope } from '@nestjs/common';

@Injectable()
export class LoggerService extends ConsoleLogger {
  // Override methods if needed for custom behavior (e.g. logging to GCP specifically)
  // By default, ConsoleLogger formats things well for GCP when run in Cloud Run.

  log(message: any, context?: string) {
    super.log(message, context);
  }

  error(message: any, trace?: string, context?: string) {
    // If you pass an Error object, extract its message or stack
    if (message instanceof Error) {
        super.error(message.message, message.stack, context);
    } else {
        super.error(message, trace, context);
    }
  }

  warn(message: any, context?: string) {
    super.warn(message, context);
  }

  debug(message: any, context?: string) {
    super.debug(message, context);
  }

  verbose(message: any, context?: string) {
    super.verbose(message, context);
  }
}
