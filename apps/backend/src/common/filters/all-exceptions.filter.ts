import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw = isHttp ? exception.getResponse() : { message: 'Internal error' };

    const body =
      typeof raw === 'string'
        ? { code: 'ERROR', message: raw }
        : {
            code: (raw as { code?: string }).code ?? 'ERROR',
            message: (raw as { message?: string }).message ?? 'Error',
            details: (raw as { details?: unknown }).details,
          };

    if (status >= 500) {
      this.logger.error(
        `${req.method} ${req.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(status).json({
      ...body,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
