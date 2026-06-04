import { z } from 'zod';

export const createBlogSchema = z.object({
    body: z.object({
        title: z.string().min(5),
        content: z.string().min(10)
    })
});

export const commentSchema = z.object({
    body: z.object({
        text: z.string().min(1),
        authorName: z.string().optional()
    })
});
