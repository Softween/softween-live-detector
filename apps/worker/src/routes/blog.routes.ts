import { Hono } from 'hono';
import { getPublishedPosts, getPostBySlug, getRecentPosts } from '../services/blog.service';
import type { Env } from '../env';

const blog = new Hono<{ Bindings: Env }>();

// Paginated blog list
blog.get('/', async (c) => {
  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = parseInt(c.req.query('limit') || '10', 10);
  const category = c.req.query('category') || undefined;

  const result = await getPublishedPosts(c.env, page, Math.min(limit, 20), category);
  return c.json(result);
});

// Recent posts
blog.get('/recent', async (c) => {
  const posts = await getRecentPosts(c.env, 5);
  return c.json(posts);
});

// Single post by slug
blog.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const post = await getPostBySlug(c.env, slug);
  if (!post) return c.json({ error: 'Yazı bulunamadı' }, 404);
  return c.json(post);
});

export { blog as blogRoutes };
