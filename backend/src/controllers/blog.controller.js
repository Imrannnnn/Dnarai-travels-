import { Blog } from '../models/Blog.js';
import { User } from '../models/User.js';
import { NotificationService } from '../services/NotificationService.js';
import { PushService } from '../services/PushService.js';

/**
 * Controller for blog operations
 */
export const blogController = {
    /**
     * Fetches all blogs for the public list
     */
    getAll: async (req, res, next) => {
        try {
            // Find all blogs, sorted newest first
            const blogs = await Blog.find()
                .populate('author', 'email role')
                .sort({ createdAt: -1 });

            res.json(blogs);
        } catch (err) {
            next(err);
        }
    },

    /**
     * Generate HTML with Open Graph tags for social media previews
     */
    getSharePreview: async (req, res, next) => {
        try {
            const { slug } = req.params;
            const blog = await Blog.findOne({ slug });

            if (!blog) {
                return res.status(404).send('Insight not found');
            }

            const plainText = (blog.content || '').replace(/<[^>]*>?/gm, '');
            let description = plainText.substring(0, 150);
            if (plainText.length > 150) description += '...';

            const safeTitle = blog.title.replace(/"/g, '&quot;').replace(/&/g, '&amp;');
            const safeDesc = description.replace(/"/g, '&quot;').replace(/&/g, '&amp;');
            // Assume the frontend URL is allowedOrigin[1] or from env
            const frontendUrl = process.env.FRONTEND_URL || 'https://dnaraitravels.netlify.app';
            const redirectUrl = `${frontendUrl}/blog/${slug}`;

            let rawImageUrl = blog.imageUrl;
            if (!rawImageUrl) {
                rawImageUrl = `${frontendUrl}/D-NARAI_Logo-04.png`;
            } else if (rawImageUrl.startsWith('/')) {
                rawImageUrl = `${frontendUrl}${rawImageUrl}`;
            }

            const safeImageUrl = rawImageUrl.replace(/&/g, '&amp;');

            // Removed duplicate declarations of frontendUrl and redirectUrl

            const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${safeTitle} | D.Narai Insight</title>
    <meta name="description" content="${safeDesc}" />

    <!-- Open Graph for Facebook/WhatsApp/LinkedIn -->
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${redirectUrl}" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDesc}" />
    <meta property="og:image" content="${safeImageUrl}" />
    <meta property="og:image:secure_url" content="${safeImageUrl}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${redirectUrl}" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDesc}" />
    <meta name="twitter:image" content="${safeImageUrl}" />

    <!-- JS Redirect for Users -->
    <script>
        window.location.replace("${redirectUrl}");
    </script>
</head>
<body>
    <p>Redirecting to <a href="${redirectUrl}">${safeTitle}</a>...</p>
</body>
</html>`;
            res.setHeader('Content-Type', 'text/html');
            res.send(html);
        } catch (err) {
            next(err);
        }
    },

    /**
     * Fetches a single blog by its slug (unique URL based on title)
     */
    getBySlug: async (req, res, next) => {
        try {
            const { slug } = req.params;
            const blog = await Blog.findOne({ slug }).populate('author', 'email role');

            if (!blog) {
                return next({ status: 404, message: 'Blog post not found' });
            }

            res.json(blog);
        } catch (err) {
            next(err);
        }
    },

    /**
     * Creates a new blog post (Requires Auth - Admin/Agent)
     */
    create: async (req, res, next) => {
        try {
            // Permission check: Allow any non-passenger (admin, staff, agent, etc.)
            if (req.user.role === 'passenger') {
                return next({ status: 403, message: 'Not authorized: Passengers cannot create travel insights.' });
            }

            const { title, content } = req.validated.body;

            // Create a slug from the title (lowercase, no symbols, dashes instead of spaces)
            const slug = title
                .toLowerCase()
                .replace(/[^\w ]+/g, '')
                .replace(/ +/g, '-');

            // Check if slug already exists
            const existing = await Blog.findOne({ slug });
            if (existing) {
                return next({
                    status: 400,
                    message: 'A blog with a similar title already exists. Please change the title.'
                });
            }

            // Automated aviation-themed image generation (High quality airplane/airline visuals)
            const imageUrl = `https://images.unsplash.com/photo-1436491865332-7a61a109c055?auto=format&fit=crop&q=80&w=1600`;

            const blog = await Blog.create({
                title,
                slug,
                content,
                author: req.user.sub,
                imageUrl
            });

            // BROADCAST: Notify all passengers/users about the new post
            // This runs in the background to avoid delaying the response
            (async () => {
                try {
                    const allUsers = await User.find({ role: 'passenger' });

                    for (const user of allUsers) {
                        // 1. Create In-App Notification
                        await NotificationService.createInApp({
                            passengerId: user.passengerId,
                            type: 'blog_update',
                            message: `New Insight: "${title}". Read the latest travel update from Dnarai.`,
                            meta: { slug: blog.slug, title: blog.title }
                        }).catch(() => { });

                        // 2. Send Web Push if subscriber exists
                        if (user.pushSubscriptions && user.pushSubscriptions.length > 0) {
                            await PushService.sendPushNotification(user, {
                                title: 'New Travel Insight',
                                body: title,
                                url: `/blog/${blog.slug}`,
                                type: 'blog'
                            }).catch(() => { });
                        }
                    }
                } catch (broadcastErr) {
                    console.error('Failed to broadcast blog notification:', broadcastErr);
                }
            })();

            res.status(201).json(blog);
        } catch (err) {
            next(err);
        }
    },

    /**
     * Allows anyone to comment on a blog post (No Auth required)
     */
    addComment: async (req, res, next) => {
        try {
            const { slug } = req.params;
            const { text, authorName } = req.validated.body;

            const blog = await Blog.findOne({ slug });
            if (!blog) {
                return next({ status: 404, message: 'Blog post not found' });
            }

            // Append comment
            blog.comments.push({
                text,
                author: authorName || 'Anonymous'
            });

            await blog.save();

            res.json({ ok: true, message: 'Comment added successfully', comment: blog.comments[blog.comments.length - 1] });
        } catch (err) {
            next(err);
        }
    },

    /**
     * Updates an existing blog post (Requires Auth)
     */
    update: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { title, content } = req.validated.body;

            // Permission check
            if (req.user.role === 'passenger') {
                return next({ status: 403, message: 'Not authorized' });
            }

            const blog = await Blog.findById(id);
            if (!blog) {
                return next({ status: 404, message: 'Blog post not found' });
            }

            if (title && title !== blog.title) {
                blog.title = title;
                // Update slug if title changes
                blog.slug = title
                    .toLowerCase()
                    .replace(/[^\w ]+/g, '')
                    .replace(/ +/g, '-');

                // Ensure unique slug
                const existing = await Blog.findOne({ slug: blog.slug, _id: { $ne: id } });
                if (existing) {
                    return next({ status: 400, message: 'Slug already in use by another post' });
                }

                // Update automated image on title change (Always aviation themed)
                blog.imageUrl = `https://images.unsplash.com/photo-1544016768-982d1554f0b9?auto=format&fit=crop&q=80&w=1600`;
            }

            if (content) blog.content = content;
            await blog.save();

            res.json(blog);
        } catch (err) {
            next(err);
        }
    },

    /**
     * Deletes a blog post (Requires Auth)
     */
    delete: async (req, res, next) => {
        try {
            const { id } = req.params;

            // Permission check
            if (req.user.role === 'passenger') {
                return next({ status: 403, message: 'Not authorized' });
            }

            const blog = await Blog.findByIdAndDelete(id);
            if (!blog) {
                return next({ status: 404, message: 'Blog post not found' });
            }

            res.json({ ok: true, message: 'Blog post deleted' });
        } catch (err) {
            next(err);
        }
    }
};
