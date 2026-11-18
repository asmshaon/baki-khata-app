import { serverMessage } from '@baki/shared';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { MulterError } from 'multer';
import { HttpError } from './lib/http-error.js';
import { langOf, translateFieldErrors } from './lib/i18n.js';
import { authRouter } from './routes/auth.js';
import { customerRouter } from './routes/customer.js';
import { ownerRouter, uploadDir } from './routes/owner.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));
  app.use('/uploads', express.static(uploadDir, { maxAge: '7d' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.use('/auth', authRouter);
  app.use('/owner', ownerRouter);
  app.use('/customer', customerRouter);

  app.use((req, res) => {
    res.status(404).json({ message: serverMessage(langOf(req), 'notFound') });
  });

  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const lang = langOf(req);
    if (err instanceof HttpError) {
      res
        .status(err.status)
        .json({ message: serverMessage(lang, err.messageKey), fieldErrors: translateFieldErrors(lang, err.fieldErrors) });
      return;
    }
    if (err instanceof MulterError) {
      res.status(422).json({ message: serverMessage(lang, 'photoInvalid') });
      return;
    }
    if (err instanceof SyntaxError) {
      res.status(400).json({ message: serverMessage(lang, 'badRequest') });
      return;
    }
    console.error(err);
    res.status(500).json({ message: serverMessage(lang, 'serverError') });
  });

  return app;
}
