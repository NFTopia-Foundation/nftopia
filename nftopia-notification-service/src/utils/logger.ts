import winston from 'winston';
import  config  from '../config/env';

// Define your log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Determine what level to use based on environment
const level = () => {
  return config.NODE_ENV === 'development' ? 'debug' : 'info';
};

// Define different colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

// Tell winston to add colors
winston.addColors(colors);

// Define the log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define which transports the logger should use
const transports = [
  // Console output
  new winston.transports.Console(),
  
  // Error logs file
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: winston.format.combine(
      winston.format.uncolorize(), // Remove colors for file output
      winston.format.json()
    )
  }),
  
  // All logs file
  new winston.transports.File({
    filename: 'logs/all.log',
    format: winston.format.combine(
      winston.format.uncolorize(), // Remove colors for file output
      winston.format.json()
    )
  })
];

// Create the logger instance
export const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports
});

// Stream for morgan (HTTP logging)
export const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  }
};