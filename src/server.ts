import start from '@tanstack/react-start/server-entry';

import { handleMediaRequest } from '@/lib/server/imageStorage.server';
import { handleRequestInContext, type AppBindings } from '@/lib/server/runtimeContext.server';

export default {
  fetch(request: Request, bindings: AppBindings): Promise<Response> {
    return handleRequestInContext(request, bindings, () => {
      if (new URL(request.url).pathname.startsWith('/media/')) {
        return handleMediaRequest(request, bindings);
      }
      return start.fetch(request);
    });
  },
};
