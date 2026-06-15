/* global Netlify, Deno */
export default async (request, context) => {
    const url = new URL(request.url);
    const path = url.pathname;

    let apiUrl = "http://localhost:5000";
    if (typeof Netlify !== "undefined" && Netlify.env && Netlify.env.get) {
        apiUrl = Netlify.env.get("VITE_API_BASE_URL") || apiUrl;
    } else if (typeof Deno !== "undefined" && Deno.env && Deno.env.get) {
        apiUrl = Deno.env.get("VITE_API_BASE_URL") || apiUrl;
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
    } catch (e) {
        console.error(`Error proxying ${path} in edge function:`, e);
    }

    return context.next();
};
