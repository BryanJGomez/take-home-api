import { ExceptionBase } from './exception.base';
import { ExceptionType } from './exception.types';

export class ArgumentInvalidException extends ExceptionBase {
  // Bad Request
  readonly statusCode = 400;
  readonly type = ExceptionType.ArgumentInvalid;
}
// Not Found
export class RecordNotFoundException extends ExceptionBase {
  readonly statusCode = 404;
  readonly type = ExceptionType.RecordNotFound;
}
// Internal Server Error Exception
export class InternalServerErrorException extends ExceptionBase {
  readonly statusCode = 500;
  readonly type = ExceptionType.InternalServerErrorMessage;
}
