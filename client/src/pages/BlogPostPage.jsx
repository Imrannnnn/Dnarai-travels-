import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { getApiBaseUrl } from '../data/api';

/**
 * Single Blog Page
 * Anyone can read, copy the link, and comment.
 * Premium, minimal design focused on content and interaction.
 */
export default function BlogPostPage() {
    const { slug } = useParams();
    const [blog, setBlog] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [commentText, setCommentText] = useState('');
    const [commentAuthor, setCommentAuthor] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    const baseUrl = getApiBaseUrl();

    useEffect(() => {
        async function fetchBlog() {
            try {
                const res = await fetch(`${baseUrl}/api/blogs/${slug}`);
                if (res.ok) {
                    const data = await res.json();
                    setBlog(data);
                } else {
                    setError('Insight not found');
                }
            } catch (err) {
                console.error('Failed to fetch blog:', err);
                setError('Network error');
            } finally {
                setLoading(false);
            }
        }
        fetchBlog();
    }, [slug, baseUrl]);

    useEffect(() => {
        if (blog) {
            document.title = `${blog.title} | D.Narai Insight`;

            const setMeta = (property, content) => {
                let element = document.querySelector(`meta[property="${property}"]`) || document.querySelector(`meta[name="${property}"]`);
                if (!element) {
                    element = document.createElement('meta');
                    if (property.startsWith('og:')) {
                        element.setAttribute('property', property);
                    } else {
                        element.setAttribute('name', property);
                    }
                    document.head.appendChild(element);
                }
                element.setAttribute('content', content);
            };

            const plainText = (blog.content || '').replace(/<[^>]*>?/gm, '');
            let description = plainText.substring(0, 150);
            if (plainText.length > 150) description += '...';

            let imageUrl = blog.imageUrl;
            if (!imageUrl) {
                // Determine absolute URL for logo fallback
                imageUrl = `${window.location.origin}/D-NARAI_Logo%2001.svg`;
            } else if (imageUrl.startsWith('/')) {
                // Ensure any relative URL is absolute
                imageUrl = `${window.location.origin}${imageUrl}`;
            }

            setMeta('og:title', blog.title);
            setMeta('og:description', description);
            setMeta('og:image', imageUrl);
            setMeta('og:url', window.location.href);
            setMeta('og:type', 'article');

            setMeta('twitter:card', 'summary_large_image');
            setMeta('twitter:title', blog.title);
            setMeta('twitter:description', description);
            setMeta('twitter:image', imageUrl);
            setMeta('description', description);
        }
    }, [blog]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const handleComment = async (e) => {
        e.preventDefault();
        if (!commentText.trim()) return;

        setSubmitting(true);
        try {
            const res = await fetch(`${baseUrl}/api/blogs/${slug}/comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: commentText,
                    authorName: commentAuthor || 'Anonymous'
                })
            });

            if (res.ok) {
                const data = await res.json();
                // Optimistically update comments
                setBlog(prev => ({
                    ...prev,
                    comments: [...(prev.comments || []), data.comment]
                }));
                setCommentText('');
                setCommentAuthor('');
            }
        } catch (err) {
            console.error('Comment failed:', err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
            <div className="w-12 h-12 border-4 border-dnarai-gold-400 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (error || !blog) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
            <div className="text-center space-y-6 max-w-md">
                <Lucide.SearchX size={64} className="mx-auto text-slate-300" />
                <h1 className="text-4xl font-black uppercase italic font-display">{error}</h1>
                <Link to="/blog" className="inline-flex items-center gap-2 bg-dnarai-navy-900 text-white px-8 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs">
                    <Lucide.ArrowLeft size={16} /> Back to Blog
                </Link>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 pb-20">
            {/* Navigation Top Bar */}
            <div className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800">
                <div className="container mx-auto max-w-4xl px-6 h-16 flex items-center justify-between">
                    <Link to="/blog" className="group flex items-center gap-2 text-slate-500 hover:text-dnarai-navy-900 transition-colors">
                        <Lucide.ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Explore More</span>
                    </Link>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleCopyLink}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${copySuccess
                                ? 'bg-green-500 text-white shadow-lg'
                                : 'bg-dnarai-gold-500/10 text-dnarai-gold-600 border border-dnarai-gold-500/30 hover:bg-dnarai-gold-500 hover:text-white'
                                }`}
                        >
                            {copySuccess ? <Lucide.Check size={14} /> : <Lucide.Share2 size={14} />}
                            {copySuccess ? 'Link Copied' : 'Copy Insight Link'}
                        </button>
                    </div>
                </div>
            </div>

            <article className="container mx-auto max-w-4xl px-6 pt-16 space-y-12">
                {/* Post Title Section */}
                <header className="space-y-6 text-center lg:text-left">
                    <div className="text-[10px] font-black uppercase tracking-[0.5em] text-dnarai-gold-500 italic">
                        Dnarai Intelligence Paper
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white leading-[1.1] uppercase italic font-display">
                        {blog.title}
                    </h1>
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-slate-400">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                            <Lucide.User size={14} className="text-dnarai-gold-500" />
                            <span>Dnarai Admin Office</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                            <Lucide.Calendar size={14} className="text-dnarai-gold-500" />
                            <span>{new Date(blog.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                    </div>
                </header>

                {/* Featured Image */}
                <div className="aspect-[21/9] rounded-[2.5rem] overflow-hidden shadow-premium bg-slate-100 dark:bg-slate-900">
                    <img
                        src={blog.imageUrl || "https://images.unsplash.com/photo-1436491865332-7a61a109c055?auto=format&fit=crop&q=80&w=1200"}
                        alt={blog.title}
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/D-NARAI_Logo 01.svg";
                            e.target.className = "w-full h-full object-contain p-12 bg-slate-50 dark:bg-slate-800";
                        }}
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* Content Body */}
                <div className="prose prose-xl prose-slate dark:prose-invert max-w-none">
                    <div className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium space-y-6 whitespace-pre-wrap">
                        {blog.content}
                    </div>
                </div>

                {/* Comments Section */}
                <section className="pt-20 border-t border-slate-100 dark:border-slate-800 space-y-10">
                    <div className="flex items-center justify-between">
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic font-display">
                            Interaction <span className="text-dnarai-gold-500">Node</span>
                        </h2>
                        <div className="px-4 py-2 rounded-full bg-slate-50 dark:bg-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-400 border border-slate-100 dark:border-slate-800">
                            {blog.comments?.length || 0} Total Feedback
                        </div>
                    </div>

                    {/* Comment Form */}
                    <form onSubmit={handleComment} className="bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800 space-y-6">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Identity (Optional)</label>
                                <input
                                    type="text"
                                    value={commentAuthor}
                                    onChange={(e) => setCommentAuthor(e.target.value)}
                                    placeholder="Anonymous Traveler"
                                    className="w-full px-6 py-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 focus:ring-2 focus:ring-dnarai-gold-500/50 focus:border-dnarai-gold-500 transition-all outline-none text-sm font-medium"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Perspective</label>
                            <textarea
                                required
                                rows={4}
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Share your thoughts on this insight..."
                                className="w-full px-6 py-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 focus:ring-2 focus:ring-dnarai-gold-500/50 focus:border-dnarai-gold-500 transition-all outline-none text-sm font-medium resize-none shadow-soft"
                            />
                        </div>
                        <button
                            disabled={submitting}
                            className="group w-full md:w-auto flex items-center justify-center gap-3 bg-dnarai-navy-900 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-dnarai-gold-500 hover:shadow-premium transition-all duration-300 disabled:opacity-50"
                        >
                            {submitting ? 'Transmitting...' : 'Submit Perspective'}
                            <Lucide.Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </button>
                    </form>

                    {/* Comments List */}
                    <div className="space-y-6">
                        {blog.comments && blog.comments.length > 0 ? (
                            blog.comments.map((comment, i) => (
                                <div key={i} className="flex gap-4 p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-soft border border-slate-50 dark:border-slate-800 transition-all hover:bg-slate-50 dark:hover:bg-slate-900/80">
                                    <div className="h-10 w-10 rounded-xl bg-dnarai-gold-500/10 flex items-center justify-center text-dnarai-gold-600 shrink-0">
                                        <Lucide.User size={20} />
                                    </div>
                                    <div className="space-y-2 overflow-hidden flex-1">
                                        <div className="flex items-center justify-between gap-4">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-dnarai-navy-900 dark:text-dnarai-gold-400 truncate">
                                                {comment.author}
                                            </span>
                                            <span className="text-[10px] font-medium text-slate-400 shrink-0">
                                                {new Date(comment.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed break-words">
                                            {comment.text}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-12 text-center text-slate-300 space-y-4">
                                <Lucide.MessageSquareDashed size={40} className="mx-auto" />
                                <p className="text-[10px] font-black uppercase tracking-widest">No existing perspectives. Be the first to share.</p>
                            </div>
                        )}
                    </div>
                </section>
            </article>
        </div>
    );
}
