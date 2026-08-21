const githubHeaders = token => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28'
});

export default async function handler(request, response) {
  const token = parseCookies(request.headers.cookie || '').ssn_github_token;
  if (!token) return response.status(401).json({ error: 'Please sign in with GitHub.' });

  const userResponse = await fetch('https://api.github.com/user', { headers: githubHeaders(token) });
  const user = userResponse.ok ? await userResponse.json() : null;
  if (!user || (process.env.GITHUB_ALLOWED_USER && user.login.toLowerCase() !== process.env.GITHUB_ALLOWED_USER.toLowerCase())) {
    return response.status(403).json({ error: 'This GitHub account is not authorized to publish.' });
  }

  const repo = process.env.GITHUB_REPO || 'BhanusMeet/SSN-WEB-SITE2';
  const branch = process.env.GITHUB_BRANCH || 'main';
  const filePath = 'content/blog-posts.json';
  const fileUrl = `https://api.github.com/repos/${repo}/contents/${filePath}`;

  try {
    const fileResponse = await fetch(`${fileUrl}?ref=${encodeURIComponent(branch)}`, {
      headers: githubHeaders(token)
    });
    const file = fileResponse.ok ? await fileResponse.json() : null;

    if (request.method === 'GET') {
      return response.status(200).json({ posts: file ? decodeContent(file.content) : [] });
    }

    if (request.method !== 'POST') {
      return response.status(405).json({ error: 'Method not allowed.' });
    }

    const body = await readJson(request);
    const posts = file ? decodeContent(file.content) : [];
    let nextPosts = posts;

    if (body.action === 'save' && body.post) {
      nextPosts = [body.post, ...posts.filter(post => post.id !== body.post.id)];
    } else if (body.action === 'delete' && body.postId) {
      nextPosts = posts.filter(post => post.id !== body.postId);
    } else {
      return response.status(400).json({ error: 'Invalid content action.' });
    }

    const updateResponse = await fetch(fileUrl, {
      method: 'PUT',
      headers: { ...githubHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `${body.action === 'save' ? 'Publish' : 'Remove'} blog article`,
        content: Buffer.from(JSON.stringify(nextPosts, null, 2) + '\n').toString('base64'),
        sha: file?.sha,
        branch
      })
    });

    if (!updateResponse.ok) {
      const detail = await updateResponse.text();
      console.error('GitHub content update failed:', detail);
      return response.status(502).json({ error: 'GitHub could not save the article.' });
    }

    return response.status(200).json({ posts: nextPosts });
  } catch (error) {
    console.error('Blog content route failed:', error);
    return response.status(500).json({ error: 'The blog service is temporarily unavailable.' });
  }
}

function decodeContent(content) {
  return JSON.parse(Buffer.from(content.replace(/\n/g, ''), 'base64').toString('utf8'));
}

function parseCookies(value) {
  return Object.fromEntries(value.split(';').map(part => part.trim().split('=')));
}

async function readJson(request) {
  if (request.body && typeof request.body === 'object') return request.body;
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}
