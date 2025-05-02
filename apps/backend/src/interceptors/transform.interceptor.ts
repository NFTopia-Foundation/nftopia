import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  constructor(private readonly classType: any) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // Handle pagination responses
        if (
          data &&
          typeof data === 'object' &&
          data.hasOwnProperty('items') &&
          data.hasOwnProperty('meta')
        ) {
          return {
            ...data,
            items: this.transformData(data.items),
          };
        }

        // Handle arrays
        if (Array.isArray(data)) {
          return this.transformData(data);
        }

        // Handle single objects
        return this.transformToDTO(data);
      }),
    );
  }

  private transformData(data: any[]): any[] {
    return data.map((item) => this.transformToDTO(item));
  }

  private transformToDTO(data: any): any {
    if (!data) return data;
    return plainToInstance(this.classType, data, {
      excludeExtraneousValues: true,
    });
  }
}

/* 
Usage Guide


@Controller('users')
@UseInterceptors(new TransformInterceptor(UserResponseDto))
export class UsersController {
  @Get()
  findAll() {
    // ...
  }
}
*/
