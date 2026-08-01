// Vercel Edge. Same core, same guarantee: the browser never holds a credential.
import { handleGloo } from '../../functions-shared/gloo';

export const config = { runtime: 'edge' };

export default (request: Request): Promise<Response> =>
  handleGloo(request, {
    clientId: process.env['GLOO_CLIENT_ID'],
    clientSecret: process.env['GLOO_CLIENT_SECRET'],
  });
