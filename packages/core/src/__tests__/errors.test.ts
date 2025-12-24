import {
  BaseError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../errors.js';

describe('errors', () => {
  it('BaseError should set statusCode and isOperational', () => {
    const err = new BaseError('boom', 500, false);

    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(500);
    expect(err.isOperational).toBe(false);
  });

  it('ValidationError should default to 400', () => {
    const err = new ValidationError('bad');
    expect(err.statusCode).toBe(400);
  });

  it('NotFoundError should default message and 404', () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Resource not found');
  });

  it('UnauthorizedError should default to 401', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
  });

  it('ForbiddenError should default to 403', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
  });

  it('ConflictError should default to 409', () => {
    const err = new ConflictError();
    expect(err.statusCode).toBe(409);
  });
});
