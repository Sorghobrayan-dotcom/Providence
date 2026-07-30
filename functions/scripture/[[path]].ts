// Cloudflare Pages Functions. Bindings arrive on context.env rather than process.
import { handleScripture } from '../../functions-shared/scripture';

interface Context {
  request: Request;
  env: { YOUVERSION_APP_KEY?: string };
}

export const onRequest = (context: Context): Promise<Response> =>
  handleScripture(context.request, { appKey: context.env.YOUVERSION_APP_KEY });
