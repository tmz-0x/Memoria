import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // If headers already sent, delegate to default express handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle SQLite constraint errors gracefully
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || err.message?.includes('UNIQUE constraint failed')) {
    if (err.message?.includes('normalized_reg_number')) {
      res.status(409).json({
        success: false,
        code: 'REGISTRATION_NUMBER_ALREADY_USED',
        message: 'This university registration number has already been registered for a ticket.',
      });
      return;
    }

    if (err.message?.includes('idempotency_key')) {
      res.status(409).json({
        success: false,
        code: 'DUPLICATE_SUBMISSION',
        message: 'A submission with this idempotency key is already processed.',
      });
      return;
    }

    res.status(409).json({
      success: false,
      code: 'DUPLICATE_ENTRY',
      message: 'A conflicting record already exists in the system.',
    });
    return;
  }

  // Handle Multer upload errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        code: 'FILE_TOO_LARGE',
        message: 'Payment slip file size exceeds the 5MB maximum limit.',
      });
      return;
    }
    res.status(400).json({
      success: false,
      code: 'UPLOAD_ERROR',
      message: err.message,
    });
    return;
  }

  // Known AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  // Unknown internal server error - never expose stack trace in production
  console.error('[Unhandled Server Error]:', err);
  res.status(500).json({
    success: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected internal error occurred. Please try again later.',
  });
}
