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
// Too Many Requests
export class TooManyRequestsException extends ExceptionBase {
  readonly statusCode = 429;
  readonly type = ExceptionType.TooManyRequests;
}
// Payment Required
export class PaymentRequiredException extends ExceptionBase {
  readonly statusCode = 402;
  readonly type = ExceptionType.PaymentRequired;
}
// Unprocessable Entity
export class UnprocessableEntityException extends ExceptionBase {
  readonly statusCode = 422;
  readonly type = ExceptionType.UnprocessableEntity;
}
// Service Unavailable
export class ServiceUnavailableException extends ExceptionBase {
  readonly statusCode = 503;
  readonly type = ExceptionType.ServiceUnavailable;
}
