export function getTenant(req) {
  const apiToken = (req.headers['x-api-token'] || '').toString();
  const workspaceId = (req.headers['workspace_id'] || '').toString();

  const expected = process.env.API_TOKEN || process.env.ONEELEVEN_API_TOKEN;

  if (!expected) throw new Error('Missing API_TOKEN on server');
  if (!apiToken || apiToken !== expected) {
    const err = new Error('Unauthorized');
    err.statusCode = 401;
    throw err;
  }
  if (!workspaceId) {
    const err = new Error('Missing workspace_id');
    err.statusCode = 400;
    throw err;
  }

  return { workspaceId };
}
