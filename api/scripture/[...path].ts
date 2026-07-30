// Vercel Edge. Same core, same guarantee: the browser never holds a credential.
import { handleScripture } from '../../functions-shared/scripture';

export const config = { runtime: 'edge' };

export default (request: Request): Promise<Response> =>
  handleScripture(request, { appKey: process.env['YOUVERSION_APP_KEY'] });
