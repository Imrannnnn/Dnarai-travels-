/* global Netlify, Deno */
export default async (request, context) => {
    const url = new URL(request.url);
    const path = url.pathname;
    const match = path.match(/^\/blog\/([^/]+)\/?$/);

    if (!match) {
        return context.next();
    }

    const slug = match[1];

    // Fetch the standard index.html from Netlify
    const response = await context.next();

    // Make sure we're only modifying HTML
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("text/html")) {
        return response;
    }

    let html = await response.text();

    try {
        // Try getting the backend URL from environment variables
        // We look for VITE_API_BASE_URL, but fallback to known production URLs if needed
        let apiUrl = "http://localhost:5000";
        if (typeof Netlify !== "undefined" && Netlify.env && Netlify.env.get) {
            apiUrl = Netlify.env.get("VITE_API_BASE_URL") || apiUrl;
        } else if (typeof Deno !== "undefined" && Deno.env && Deno.env.get) {
            apiUrl = Deno.env.get("VITE_API_BASE_URL") || apiUrl;
        }

        const res = await fetch(`${apiUrl}/api/blogs/${slug}`);
        if (res.ok) {
            const blog = await res.json();

            // Clean content for description
            const plainText = (blog.content || '').replace(/<[^>]*>?/gm, '');
            let description = plainText.substring(0, 150);
            if (plainText.length > 150) description += '...';

            // Escape quotes
            const safeTitle = blog.title.replace(/"/g, '&quot;');
            const safeDesc = description.replace(/"/g, '&quot;');
            const imageUrl = blog.imageUrl || 'https://images.unsplash.com/photo-1436491865332-7a61a109c055?auto=format&fit=crop&q=80&w=1200';

            const metaTags = `
    <!-- Dynamic Open Graph Tags from Edge Function -->
    <title>${safeTitle} | D.Narai Insight</title>
    <meta name="description" content="${safeDesc}" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDesc}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:url" content="${url.href}" />
    <meta property="og:type" content="article" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDesc}" />
    <meta name="twitter:image" content="${imageUrl}" />
            `;

            // Insert meta tags before </head>
            html = html.replace('</head>', `${metaTags}\n</head>`);
        }
    } catch (e) {
        console.error("Error in seo-preview edge function:", e);
    }

    return new Response(html, {
        headers: { "content-type": "text/html" }
    });
};
