import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    const userAgent = request.get('user-agent') || '';
    const ip = request.ip;

    const now = Date.now();
    const requestBody = this.sanitizeRequestBody(request.body);

    this.logger.log(
      `[REQUEST] ${method} ${url} - IP: ${ip} - User Agent: ${userAgent} - Body: ${JSON.stringify(requestBody)}`,
    );

    return next.handle().pipe(
      tap({
        next: (response) => {
          const responseTime = Date.now() - now;
          this.logger.log(
            `[RESPONSE] ${method} ${url} - ${responseTime}ms - Response: ${this.truncateResponse(JSON.stringify(response))}`,
          );
        },
        error: (error) => {
          const responseTime = Date.now() - now;
          this.logger.error(
            `[ERROR] ${method} ${url} - ${responseTime}ms - ${error.message}`,
            error.stack,
          );
        },
      }),
    );
  }

  private sanitizeRequestBody(body: any): any {
    if (!body) return {};

    // Create a copy of the body to avoid modifying the original
    const sanitized = { ...body };

    // Redact sensitive fields
    const sensitiveFields = ['password', 'token'];
    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '******';
      }
    });

    return sanitized;
  }

  private truncateResponse(response: string, maxLength = 500): string {
    if (response.length <= maxLength) {
      return response;
    }
    return `${response.substring(0, maxLength)}... [truncated]`;
  }
}
