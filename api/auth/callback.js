export default async function handler(request, response) {
  const { code, state } = request.query;
  const cookies = parseCookies(request.headers.cookie || '');

  if (!code || !state || state !== cookies.ssn_oauth_state) {
    return response.status(400).send('Invalid GitHub login state. Please try again.');
  }

  const redirectUri = process.env.GITHUB_OAUTH_REDIRECT_URI || `${getOrigin(request)}/api/auth/callback`;
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri
    })
  });
  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok || !tokenData.access_token) {
    return response.status(502).send('GitHub login could not be completed.');
  }

  response.setHeader('Set-Cookie', [
    'ssn_oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
    `ssn_github_token=${tokenData.access_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`
  ]);
  return response.redirect('/blog-publisher.html');
}

function parseCookies(value) {
  return Object.fromEntries(value.split(';').map(part => part.trim().split('=')));
}

function getOrigin(request) {
  const protocol = request.headers['x-forwarded-proto'] || 'https';
  return `${protocol}://${request.headers.host}`;
}
