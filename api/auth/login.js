import crypto from 'node:crypto';

export default function handler(request, response) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return response.status(500).json({ error: 'GITHUB_CLIENT_ID is not configured.' });
  }

  const state = crypto.randomBytes(24).toString('hex');
  const redirectUri = process.env.GITHUB_OAUTH_REDIRECT_URI || `${getOrigin(request)}/api/auth/callback`;
  const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('scope', 'repo');
  authorizeUrl.searchParams.set('state', state);

  response.setHeader('Set-Cookie', `ssn_oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`);
  return response.redirect(authorizeUrl.toString());
}

function getOrigin(request) {
  const protocol = request.headers['x-forwarded-proto'] || 'https';
  return `${protocol}://${request.headers.host}`;
}
