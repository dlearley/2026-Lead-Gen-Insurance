import { Request, Response, NextFunction } from 'express';
import zlib from 'zlib';
import { logger } from '../logger/index.js';

export interface CompressionOptions {
  threshold?: number;
  level?: number;
  filter?: (req: Request, res: Response) => boolean;
}

export function createCompressionMiddleware(options: CompressionOptions = {}) {
  const threshold = options.threshold || 1024;
  const level = options.level || zlib.constants.Z_DEFAULT_COMPRESSION;
  const filter = options.filter || defaultFilter;

  return (req: Request, res: Response, next: NextFunction) => {
    if (!filter(req, res)) {
      return next();
    }

    const acceptEncoding = req.headers['accept-encoding'] || '';
    
    let encoding: 'gzip' | 'deflate' | null = null;
    if (acceptEncoding.includes('gzip')) {
      encoding = 'gzip';
    } else if (acceptEncoding.includes('deflate')) {
      encoding = 'deflate';
    }

    if (!encoding) {
      return next();
    }

    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);
    const chunks: Buffer[] = [];

    res.write = function (chunk: any, ...args: any[]): boolean {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return true;
    };

    res.end = function (chunk?: any, ...args: any[]): Response {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      const buffer = Buffer.concat(chunks);
      
      if (buffer.length < threshold) {
        res.write = originalWrite;
        res.end = originalEnd;
        
        if (chunks.length > 0) {
          originalWrite(buffer);
        }
        return originalEnd();
      }

      const compressStream = encoding === 'gzip'
        ? zlib.createGzip({ level })
        : zlib.createDeflate({ level });

      res.setHeader('Content-Encoding', encoding);
      res.removeHeader('Content-Length');

      res.write = originalWrite;
      res.end = originalEnd;

      compressStream.on('data', (compressed) => {
        originalWrite(compressed);
      });

      compressStream.on('end', () => {
        originalEnd();
      });

      compressStream.on('error', (error) => {
        logger.error('Compression error', { error });
        originalEnd();
      });

      compressStream.end(buffer);

      return res;
    };

    next();
  };
}

function defaultFilter(req: Request, res: Response): boolean {
  const contentType = res.getHeader('Content-Type');
  if (!contentType) {
    return true;
  }

  const type = typeof contentType === 'string' ? contentType : contentType.toString();
  
  const compressibleTypes = [
    'text/',
    'application/json',
    'application/javascript',
    'application/xml',
    'application/x-yaml',
  ];

  return compressibleTypes.some(compressible => type.includes(compressible));
}
