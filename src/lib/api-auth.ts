import 'server-only';

import { auth } from '@/lib/auth';

function getBearerToken(authorization: string | null) {
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(' ', 2);
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
    return null;
  }

  return token;
}

function getApiKeyFromHeaders(headers: Headers) {
  return headers.get('x-api-key') ?? getBearerToken(headers.get('authorization'));
}

export async function getRequestAuth(request: Request) {
  const apiKey = getApiKeyFromHeaders(request.headers);

  if (apiKey) {
    const result = await auth.api.verifyApiKey({
      body: { key: apiKey },
    });

    if (result.valid && result.key) {
      return {
        type: 'api-key' as const,
        userId: result.key.referenceId,
        apiKey: result.key,
      };
    }
  }

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return null;
  }

  return {
    type: 'session' as const,
    userId: session.user.id,
    session,
  };
}
