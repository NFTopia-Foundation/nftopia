import createHttpError from 'http-errors';

export const NotFound = (msg = 'Not Found') => new createHttpError.NotFound(msg);
export const BadRequest = (msg = 'Bad Request') => new createHttpError.BadRequest(msg);
export const Conflict = (msg = 'Conflict') => new createHttpError.Conflict(msg);