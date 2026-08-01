// Cloudflare Pages Functions. Bindings arrive on context.env rather than process.
import { handleGloo } from '../../functions-shared/gloo';

interface Context {
  request: Request;
  env: { GLOO_CLIENT_ID?: string; GLOO_CLIENT_SECRET?: string };
}

export const onRequest = (context: Context): Promise<Response> =>
  handleGloo(context.request, {
    clientId: context.env.GLOO_CLIENT_ID,
    clientSecret: context.env.GLOO_CLIENT_SECRET,
  });
