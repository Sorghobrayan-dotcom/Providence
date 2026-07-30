// Netlify Edge. The key lives in the site environment, never in the bundle.
import { handleScripture } from '../../functions-shared/scripture.ts';

export default (request: Request): Promise<Response> =>
  handleScripture(request, { appKey: Netlify.env.get('YOUVERSION_APP_KEY') });

export const config = { path: '/scripture/*' };
