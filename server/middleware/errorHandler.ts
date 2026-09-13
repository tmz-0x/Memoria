import { Request, Response, NextFunction } from 'express';
import { auditService } from '../services/auditService';

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

function respondError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  requestId: string,
  details?: any
) {
  res.status(statusCode).json({
    success: false,
    code,
    message,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
    requestId,
    ...(details ? { details } : {}),
  });
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

  const requestId = (req as any).id || (req.headers['x-request-id'] as string) || `req-${Date.now()}`;

  // Handle SQLite constraint errors gracefully
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || err.message?.includes('UNIQUE constraint failed')) {
    let code = 'DUPLICATE_ENTRY';
    let message = 'A conflicting record already exists in the system.';

    if (err.message?.includes('normalized_reg_number')) {
      code = 'REGISTRATION_NUMBER_ALREADY_USED';
      message = 'This university registration number has already been registered for a ticket.';
    } else if (err.message?.includes('idempotency_key')) {
      code = 'DUPLICATE_SUBMISSION';
      message = 'A submission with this idempotency key is already processed.';
    }

    auditService.logSystemEvent({
      severity: 'WARNING',
      eventType: 'DATABASE_CONSTRAINT_CONFLICT',
      action: `${req.method} ${req.path}`,
      module: 'DATABASE',
      message: `${code}: ${message}`,
      userId: (req as any).user?.id,
      username: (req as any).user?.name,
      requestId,
      endpoint: req.originalUrl || req.path,
      httpMethod: req.method,
      statusCode: 409,
      errorCode: code,
      errorMessage: err.message,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return respondError(res, 409, code, message, requestId);
  }

  // Handle Multer upload errors
  if (err.name === 'MulterError') {
    let code = 'UPLOAD_ERROR';
    let message = err.message;
    if (err.code === 'LIMIT_FILE_SIZE') {
      code = 'FILE_TOO_LARGE';
      message = 'Payment slip file size exceeds the 5MB maximum limit.';
    }

    auditService.logSystemEvent({
      severity: 'WARNING',
      eventType: 'UPLOAD_ERROR',
      action: `${req.method} ${req.path}`,
      module: 'UPLOAD',
      message: `${code}: ${message}`,
      userId: (req as any).user?.id,
      username: (req as any).user?.name,
      requestId,
      endpoint: req.originalUrl || req.path,
      httpMethod: req.method,
      statusCode: 400,
      errorCode: code,
      errorMessage: err.message,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return respondError(res, 400, code, message, requestId);
  }

  // Known AppError
  if (err instanceof AppError) {
    const severity = err.statusCode >= 500 ? 'ERROR' : 'WARNING';
    auditService.logSystemEvent({
      severity,
      eventType: err.statusCode >= 500 ? 'API_SERVER_ERROR' : 'API_CLIENT_ERROR',
      action: `${req.method} ${req.path}`,
      module: req.path.startsWith('/api/checkin') ? 'CHECKIN' : (req.path.startsWith('/api/admin') ? 'ADMIN' : (req.path.startsWith('/api/auth') ? 'AUTH' : 'API')),
      message: `${err.code}: ${err.message}`,
      userId: (req as any).user?.id,
      username: (req as any).user?.name,
      requestId,
      endpoint: req.originalUrl || req.path,
      httpMethod: req.method,
      statusCode: err.statusCode,
      errorCode: err.code,
      errorMessage: err.message,
      stackTrace: err.statusCode >= 500 ? err.stack : undefined,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: err.details,
    });

    return respondError(res, err.statusCode, err.code, err.message, requestId, err.details);
  }

  // Unknown internal server error - never expose stack trace to client
  console.error('[Unhandled Server Error]:', err);
  auditService.logSystemEvent({
    severity: 'ERROR',
    eventType: 'UNHANDLED_EXCEPTION',
    action: `${req.method} ${req.path}`,
    module: 'SYSTEM',
    message: `Unhandled exception: ${err?.message || 'Unknown error'}`,
    userId: (req as any).user?.id,
    username: (req as any).user?.name,
    requestId,
    endpoint: req.originalUrl || req.path,
    httpMethod: req.method,
    statusCode: 500,
    errorCode: 'INTERNAL_SERVER_ERROR',
    errorMessage: err?.message,
    stackTrace: err?.stack,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return respondError(res, 500, 'INTERNAL_SERVER_ERROR', 'An unexpected internal error occurred. Please try again later.', requestId);
}
