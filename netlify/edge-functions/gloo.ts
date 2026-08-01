// Netlify Edge. The client secret lives in the site environment, never in the
// bundle: the browser only ever posts to a same-origin path.
import { handleGloo } from '../../functions-shared/gloo.ts';

export default (request: Request): Promise<Response> =>
  handleGloo(request, {
    clientId: Netlify.env.get('GLOO_CLIENT_ID'),
    clientSecret: Netlify.env.get('GLOO_CLIENT_SECRET'),
  });

export const config = { path: '/gloo/*' };
