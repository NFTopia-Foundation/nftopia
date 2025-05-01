import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

export interface Response<T> {
  data: T;
  meta: {
    timestamp: string;
    requestId: string;
    success: boolean;
  };
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const requestId = uuidv4();
    const timestamp = new Date().toISOString();

    const response = context.switchToHttp().getResponse();
    response.setHeader('X-Request-ID', requestId);

    return next.handle().pipe(
      map((data) => ({
        data,
        meta: {
          timestamp,
          requestId,
          success: true,
        },
      })),
    );
  }
}
