import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { HTTPException } from 'hono/http-exception';

// Import converted services
import { CommentService } from './services/comment.service';
import { ProjectService } from './services/project.service';
import { AuthService } from './services/auth.service';
import { EmailService } from './services/email.service';
import { UserService } from './services/user.service';
import { PageService } from './services/page.service';
import { TokenService } from './services/token.service';
import { UsageService } from './services/usage.service';
import { SubscriptionService } from './services/subscription.service';

export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  ASSETS: Fetcher;
  JWT_SECRET: string;
  SENDGRID_API_KEY?: string;
  FROM_EMAIL?: string;
  SITE_URL: string;
}

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Timezone-Offset'],
}));

// Serve static assets for non-API routes
app.get('*', async (c) => {
  const url = new URL(c.req.url);
  
  // Handle API routes first
  if (url.pathname.startsWith('/api/')) {
    return c.notFound();
  }
  
  // Handle widget routes
  if (url.pathname.startsWith('/js/')) {
    return await handleWidgetRoutes(c);
  }
  
  // Try to serve static assets first
  try {
    const response = await c.env.ASSETS.fetch(c.req.raw);
    if (response.status !== 404) {
      return response;
    }
  } catch (error) {
    console.log('Assets fetch failed:', error);
  }
  
  // For SPA routing, serve index.html for frontend routes
  const frontendRoutes = ['/dashboard', '/login', '/projects', '/getting-start', '/forbidden', '/error'];
  const isFrontendRoute = frontendRoutes.some(route => url.pathname.startsWith(route)) || url.pathname === '/';
  
  if (isFrontendRoute) {
    // Serve a basic HTML page since ASSETS binding isn't working
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cusdis - Lightweight Comment System</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .container { text-align: center; margin-top: 50px; }
        .btn { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 10px; }
        .btn:hover { background: #0056b3; }
        .code { background: #f5f5f5; padding: 10px; border-radius: 4px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🗨️ Cusdis Comment System</h1>
        <p>Your comment system is successfully deployed!</p>
        
        <h2>Next Steps:</h2>
        <ol style="text-align: left; max-width: 600px; margin: 0 auto;">
            <li><strong>Initialize Database:</strong> Run the command below to set up your database tables</li>
            <li><strong>Create Account:</strong> Use the API endpoints to create your admin account</li>
            <li><strong>Embed Widget:</strong> Add the widget script to your website</li>
        </ol>
        
        <h3>1. Initialize Database</h3>
        <div class="code">
            npx wrangler d1 execute cusdis-comments --file=./schema.sql
        </div>
        
        <h3>2. API Endpoints</h3>
        <a href="/api/auth/register" class="btn">Register API</a>
        <a href="/js/cusdis.es.js" class="btn">Widget Script</a>
        
        <h3>3. Embed Widget</h3>
        <div class="code" style="text-align: left;">
&lt;script defer src="${c.env.SITE_URL}/js/cusdis.es.js"&gt;&lt;/script&gt;<br>
&lt;div id="cusdis_thread" data-app-id="YOUR_APP_ID" data-page-id="YOUR_PAGE_ID"&gt;&lt;/div&gt;
        </div>
        
        <p><strong>Worker URL:</strong> ${c.env.SITE_URL}</p>
    </div>
</body>
</html>`;
    
    return c.html(html);
  }
  
  return c.notFound();
});

// Widget routes
async function handleWidgetRoutes(c: any) {
  const url = new URL(c.req.url);
  
  if (url.pathname === '/js/cusdis.es.js') {
    const script = `
(function() {
  var CUSDIS_LOCALE = window.CUSDIS_LOCALE || {};
  
  function renderCusdis(target, attrs) {
    var appId = attrs['data-app-id'];
    var pageId = attrs['data-page-id'];
    var pageUrl = attrs['data-page-url'] || window.location.href;
    var pageTitle = attrs['data-page-title'] || document.title;
    var theme = attrs['data-theme'] || 'light';
    var host = attrs['data-host'] || '${c.env.SITE_URL}';
    
    if (!appId) {
      console.error('Cusdis: data-app-id is required');
      return;
    }
    
    var iframe = document.createElement('iframe');
    iframe.src = host + '/widget.html?appId=' + encodeURIComponent(appId) + 
                 '&pageId=' + encodeURIComponent(pageId || pageUrl) +
                 '&pageUrl=' + encodeURIComponent(pageUrl) +
                 '&pageTitle=' + encodeURIComponent(pageTitle) +
                 '&theme=' + encodeURIComponent(theme);
    iframe.style.width = '100%';
    iframe.style.border = 'none';
    iframe.style.minHeight = '200px';
    iframe.id = 'cusdis-iframe';
    
    target.appendChild(iframe);
    
    // Auto-resize iframe
    window.addEventListener('message', function(e) {
      if (e.origin !== '${new URL(c.env.SITE_URL).origin}') return;
      if (e.data.type === 'cusdis-resize') {
        iframe.style.height = e.data.height + 'px';
      }
    });
  }
  
  function init() {
    var targets = document.querySelectorAll('#cusdis_thread');
    targets.forEach(function(target) {
      renderCusdis(target, target.dataset);
    });
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  window.CUSDIS = {
    renderTo: renderCusdis
  };
})();
    `;
    
    return new Response(script, {
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }
  
  return c.notFound();
}

// API Routes

// Authentication
app.post('/api/auth/register', async (c) => {
  const authService = new AuthService(c.env);
  const body = await c.req.json();
  
  try {
    const result = await authService.register(body.email, body.password, body.name);
    return c.json(result);
  } catch (error: any) {
    throw new HTTPException(400, { message: error.message });
  }
});

app.post('/api/auth/login', async (c) => {
  const authService = new AuthService(c.env);
  const body = await c.req.json();
  
  try {
    const result = await authService.login(body.email, body.password);
    return c.json(result);
  } catch (error: any) {
    throw new HTTPException(401, { message: error.message });
  }
});

// JWT middleware for protected routes
const authMiddleware = jwt({
  secret: async (c) => c.env.JWT_SECRET,
});

// Public API routes (for embedded widget)
app.get('/api/open/comments', async (c) => {
  const commentService = new CommentService(c.env);
  const projectService = new ProjectService(c.env);
  
  const appId = c.req.query('appId');
  const pageId = c.req.query('pageId');
  const page = parseInt(c.req.query('page') || '1');
  const timezoneOffset = parseInt(c.req.header('X-Timezone-Offset') || '0');
  
  if (!appId || !pageId) {
    throw new HTTPException(400, { message: 'appId and pageId are required' });
  }
  
  const isDeleted = await projectService.isDeleted(appId);
  if (isDeleted) {
    return c.json({
      data: {
        commentCount: 0,
        data: [],
        pageCount: 0,
        pageSize: 10,
      }
    });
  }
  
  const comments = await commentService.getComments(appId, timezoneOffset, {
    approved: true,
    parentId: null,
    pageSlug: pageId,
    page,
    pageSize: 10,
  });
  
  return c.json({ data: comments });
});

app.post('/api/open/comments', async (c) => {
  const commentService = new CommentService(c.env);
  const projectService = new ProjectService(c.env);
  const emailService = new EmailService(c.env);
  
  const body = await c.req.json();
  const { appId, pageId, content, email, nickname, parentId, acceptNotify, pageTitle, pageUrl } = body;
  
  if (!appId || !pageId || !content || !nickname) {
    throw new HTTPException(400, { message: 'Missing required fields' });
  }
  
  const isDeleted = await projectService.isDeleted(appId);
  if (isDeleted) {
    throw new HTTPException(404, { message: 'Project not found' });
  }
  
  const comment = await commentService.addComment(appId, pageId, {
    content,
    email,
    nickname,
    pageTitle,
    pageUrl,
  }, parentId);
  
  // Send confirmation email if requested
  if (acceptNotify && email) {
    try {
      await emailService.sendConfirmReplyNotification(email, pageTitle || pageId, comment.id);
    } catch (error) {
      console.error('Failed to send confirmation email:', error);
    }
  }
  
  return c.json({ data: comment });
});

// Open approve route (for email approval links)
app.get('/api/open/approve', async (c) => {
  const commentService = new CommentService(c.env);
  const tokenService = new TokenService(c.env);
  
  const token = c.req.query('token');
  
  if (!token) {
    return c.text('Invalid token', 400);
  }
  
  try {
    const result = await tokenService.validateApproveToken(token);
    await commentService.approve(result.commentId);
    return c.text('Approved!');
  } catch (error) {
    return c.text('Invalid token', 403);
  }
});

app.post('/api/open/approve', async (c) => {
  const commentService = new CommentService(c.env);
  const tokenService = new TokenService(c.env);
  const usageService = new UsageService(c.env);
  const subscriptionService = new SubscriptionService(c.env);
  
  const token = c.req.query('token');
  const body = await c.req.json();
  const { replyContent } = body;
  
  if (!token) {
    throw new HTTPException(403, { message: 'Invalid token' });
  }
  
  let tokenBody;
  try {
    tokenBody = await tokenService.validateApproveToken(token);
  } catch (error) {
    throw new HTTPException(403, { message: 'Invalid token' });
  }
  
  // Check usage limits
  const canQuickApprove = await subscriptionService.quickApproveValidate(tokenBody.ownerId);
  if (!canQuickApprove) {
    throw new HTTPException(402, { 
      message: 'You have reached the maximum number of Quick Approve on free plan. Please upgrade to Pro plan to use Quick Approve more.' 
    });
  }
  
  // Approve comment
  await commentService.approve(tokenBody.commentId);
  
  // Add reply if provided
  if (replyContent && replyContent.trim()) {
    await commentService.addCommentAsModerator(tokenBody.commentId, replyContent, tokenBody.ownerId);
  }
  
  // Increment usage
  await usageService.incrementQuickApprove(tokenBody.ownerId);
  
  return c.json({ message: 'success' });
});

// Get comment for approval page
app.get('/api/open/approve/comment', async (c) => {
  const commentService = new CommentService(c.env);
  const tokenService = new TokenService(c.env);
  
  const token = c.req.query('token');
  
  if (!token) {
    throw new HTTPException(400, { message: 'Token is required' });
  }
  
  try {
    const tokenData = await tokenService.validateApproveToken(token);
    const comment = await commentService.getCommentForApproval(tokenData.commentId);
    return c.json({ comment });
  } catch (error) {
    throw new HTTPException(403, { message: 'Invalid token' });
  }
});

// Get comment counts for multiple pages
app.get('/api/open/project/:projectId/comments/count', async (c) => {
  const projectId = c.req.param('projectId');
  const pageIds = c.req.query('pageIds');
  
  if (!pageIds) {
    throw new HTTPException(400, { message: 'pageIds parameter is required' });
  }
  
  const pageIdArray = pageIds.split(',');
  const data: Record<string, number> = {};
  
  // Get counts for each page ID
  for (const pageId of pageIdArray) {
    const result = await c.env.DB.prepare(`
      SELECT COUNT(c.id) as count
      FROM comments c
      INNER JOIN pages p ON c.page_id = p.id
      WHERE p.slug = ? AND p.project_id = ? AND c.deleted_at IS NULL AND c.approved = 1
    `).bind(pageId, projectId).first() as any;
    
    data[pageId] = result?.count || 0;
  }
  
  return c.json({ data });
});

// Get latest comments for a project with token authentication
app.get('/api/open/project/:projectId/comments/latest', async (c) => {
  const projectService = new ProjectService(c.env);
  const projectId = c.req.param('projectId');
  const token = c.req.query('token');
  
  if (!token) {
    throw new HTTPException(403, { message: 'Invalid token' });
  }
  
  // Verify project token
  const project = await c.env.DB.prepare(`
    SELECT token, fetch_latest_comments_at
    FROM projects 
    WHERE id = ?
  `).bind(projectId).first() as any;
  
  if (!project || project.token !== token) {
    throw new HTTPException(403, { message: 'Invalid token' });
  }
  
  const comments = await projectService.fetchLatestComment(projectId, {
    from: project.fetch_latest_comments_at ? new Date(project.fetch_latest_comments_at) : undefined,
    markAsRead: true
  });
  
  return c.json({ comments });
});

// Protected routes
app.use('/api/projects/*', authMiddleware);
app.use('/api/comment/*', authMiddleware);
app.use('/api/user/*', authMiddleware);

// Projects API
app.get('/api/projects', async (c) => {
  const projectService = new ProjectService(c.env);
  const payload = c.get('jwtPayload');
  
  const projects = await projectService.listByOwner(payload.sub);
  return c.json({ data: projects });
});

app.post('/api/projects', async (c) => {
  const projectService = new ProjectService(c.env);
  const userService = new UserService(c.env);
  const payload = c.get('jwtPayload');
  const body = await c.req.json();
  
  const canCreate = await userService.canCreateProject(payload.sub);
  if (!canCreate) {
    throw new HTTPException(402, { 
      message: 'You have reached the maximum number of sites on free plan.' 
    });
  }
  
  const project = await projectService.create(body.title, payload.sub);
  return c.json({ data: project });
});

app.get('/api/project/:id', async (c) => {
  const projectService = new ProjectService(c.env);
  const payload = c.get('jwtPayload');
  const projectId = c.req.param('id');
  
  const project = await projectService.getByIdAndOwner(projectId, payload.sub);
  if (!project) {
    throw new HTTPException(404, { message: 'Project not found' });
  }
  
  return c.json({ data: project });
});

// Comments API (admin)
app.get('/api/comment', async (c) => {
  const commentService = new CommentService(c.env);
  const payload = c.get('jwtPayload');
  const projectId = c.req.query('projectId');
  const page = parseInt(c.req.query('page') || '1');
  const timezoneOffset = parseInt(c.req.header('X-Timezone-Offset') || '0');
  
  if (!projectId) {
    throw new HTTPException(400, { message: 'projectId is required' });
  }
  
  const comments = await commentService.getComments(projectId, timezoneOffset, {
    onlyOwn: true,
    page,
    pageSize: 20,
  });
  
  return c.json({ data: comments });
});

app.post('/api/comment/:id/approve', async (c) => {
  const commentService = new CommentService(c.env);
  const payload = c.get('jwtPayload');
  const commentId = c.req.param('id');
  
  const project = await commentService.getProject(commentId);
  if (project.ownerId !== payload.sub) {
    throw new HTTPException(403, { message: 'Forbidden' });
  }
  
  await commentService.approve(commentId);
  return c.json({ success: true });
});

app.delete('/api/comment/:id', async (c) => {
  const commentService = new CommentService(c.env);
  const payload = c.get('jwtPayload');
  const commentId = c.req.param('id');
  
  const project = await commentService.getProject(commentId);
  if (project.ownerId !== payload.sub) {
    throw new HTTPException(403, { message: 'Forbidden' });
  }
  
  await commentService.delete(commentId);
  return c.json({ success: true });
});

app.post('/api/comment/:id/reply', async (c) => {
  const commentService = new CommentService(c.env);
  const payload = c.get('jwtPayload');
  const commentId = c.req.param('id');
  const body = await c.req.json();
  
  const project = await commentService.getProject(commentId);
  if (project.ownerId !== payload.sub) {
    throw new HTTPException(403, { message: 'Forbidden' });
  }
  
  const reply = await commentService.addCommentAsModerator(commentId, body.content, payload.sub);
  return c.json({ data: reply });
});

// User API
app.get('/api/user', async (c) => {
  const userService = new UserService(c.env);
  const payload = c.get('jwtPayload');
  
  const user = await userService.getById(payload.sub);
  return c.json({ data: user });
});

app.put('/api/user', async (c) => {
  const userService = new UserService(c.env);
  const payload = c.get('jwtPayload');
  const body = await c.req.json();
  
  const user = await userService.updateProfile(payload.sub, body);
  return c.json({ data: user });
});

app.get('/api/user/stats', async (c) => {
  const userService = new UserService(c.env);
  const payload = c.get('jwtPayload');
  
  const stats = await userService.getStats(payload.sub);
  return c.json(stats);
});

// Error handling
app.onError((err, c) => {
  console.error('Error:', err);
  
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  
  return c.json({ error: 'Internal Server Error' }, 500);
});

export default app;