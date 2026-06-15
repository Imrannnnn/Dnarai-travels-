/* global Netlify, Deno */
export default async (request, context) => {
    const url = new URL(request.url);
    const path = url.pathname;

    // Only proxy SEO files and let everything else pass through
    const seoRoutes = ['/sitemap.xml', '/robots.txt'];
    if (!seoRoutes.includes(path)) {
        return context.next();
    }

    let apiUrl = "https://dnarai-travels.onrender.com"; // Default production API domain fallback

    if (typeof Netlify !== "undefined" && Netlify.env?.get) {
        apiUrl = Netlify.env.get("VITE_API_BASE_URL") || apiUrl;
    } else if (typeof Deno !== "undefined" && Deno.env?.get) {
        apiUrl = Deno.env.get("VITE_API_BASE_URL") || apiUrl;
    }

    if (!apiUrl) {
        console.error("VITE_API_BASE_URL is not set");
        return new Response("API URL not configured", { 
            status: 503, 
            headers: { "content-type": "text/plain" } 
        });
    }

    try {
        const res = await fetch(`${apiUrl}${path}`);

        if (res.ok) {
            const body = await res.text();
            const contentType = res.headers.get("content-type") || "text/plain";
            return new Response(body, {
                headers: {
                    "content-type": contentType,
                    "cache-control": "public, max-age=0, must-revalidate"
                }
            });
        }

        console.error(`Backend returned ${res.status} for ${path}`);
        return new Response(`Backend error: ${res.status}`, { 
            status: res.status, 
            headers: { "content-type": "text/plain" } 
        });

    } catch (e) {
        console.error(`Error proxying ${path}:`, e.message);
        return new Response(`Proxy connection failed: ${e.message}`, { 
            status: 502, 
            headers: { "content-type": "text/plain" } 
        });
    }
};
