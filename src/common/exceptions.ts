import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super({ success: false, message }, status);
  }
}

export const notFound = (msg: string) => new BusinessException(msg, HttpStatus.NOT_FOUND);
export const forbidden = (msg: string) => new BusinessException(msg, HttpStatus.FORBIDDEN);
export const conflict = (msg: string) => new BusinessException(msg, HttpStatus.CONFLICT);
