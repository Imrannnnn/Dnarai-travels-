import { Router } from 'express';

import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/authJwt.js';
import { blogController } from '../controllers/blog.controller.js';
import { createBlogSchema, commentSchema } from '../validators/blog.validator.js';

const router = Router();

// GET /api/blogs - List all blogs
router.get('/', blogController.getAll);

// GET /api/blogs/:slug/share - Get an HTML page with Open Graph tags for parsing by Facebook/WhatsApp bots
router.get('/:slug/share', blogController.getSharePreview);

// GET /api/blogs/:slug - Get a single blog by unique URL (slug)
router.get('/:slug', blogController.getBySlug);

// POST /api/blogs - Create a blog post (Requires Auth: Admin/Agent/Staff)
router.post('/', requireAuth, validate(createBlogSchema), blogController.create);

// PATCH /api/blogs/:id - Update a blog post (Requires Auth)
router.patch('/:id', requireAuth, validate(createBlogSchema), blogController.update);

// DELETE /api/blogs/:id - Delete a blog post (Requires Auth)
router.delete('/:id', requireAuth, blogController.delete);

// POST /api/blogs/:slug/comment - Add a comment (Public)
router.post('/:slug/comment', validate(commentSchema), blogController.addComment);

export default router;
