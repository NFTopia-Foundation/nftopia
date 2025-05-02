import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ErrorInterceptor implements NestInterceptor {
  private readonly logger = new Logger('ErrorInterceptor');
  private readonly isProduction = process.env.NODE_ENV === 'production';

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        const errorId = uuidv4();
        let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let stack: string | undefined;

        // Determine if it's a known HTTP exception
        if (error instanceof HttpException) {
          statusCode = error.getStatus();
          const response = error.getResponse();
          message =
            typeof response === 'object' && response['message']
              ? response['message']
              : response.toString();
        }

        // Log the error with its unique ID for correlation
        this.logger.error(`Error ${errorId}: ${error.message}`, error.stack);

        // In development, include the stack trace
        if (!this.isProduction) {
          stack = error.stack;
        }

        const errorResponse = {
          data: null,
          meta: {
            timestamp: new Date().toISOString(),
            requestId: errorId,
            success: false,
          },
          error: {
            statusCode,
            message: Array.isArray(message) ? message : [message],
            stack: stack,
          },
        };

        // Set the response status code
        context.switchToHttp().getResponse().status(statusCode);

        return throwError(() => errorResponse);
      }),
    );
  }
}
