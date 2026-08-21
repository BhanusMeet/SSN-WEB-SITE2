export default async function handler(request, response) {
  const token = parseCookies(request.headers.cookie || '').ssn_github_token;
  if (!token) return response.status(401).json({ authenticated: false });

  const githubResponse = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
  });
  if (!githubResponse.ok) return response.status(401).json({ authenticated: false });

  const user = await githubResponse.json();
  if (process.env.GITHUB_ALLOWED_USER && user.login.toLowerCase() !== process.env.GITHUB_ALLOWED_USER.toLowerCase()) {
    return response.status(403).json({ authenticated: false });
  }
  return response.status(200).json({ authenticated: true, login: user.login, avatar: user.avatar_url });
}

function parseCookies(value) {
  return Object.fromEntries(value.split(';').map(part => part.trim().split('=')));
}
