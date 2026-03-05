import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { getApiBaseUrl } from '../data/api';

/**
 * Public Blog Page
 * Displays a list of all blog posts premium styled
 */
export default function BlogListPage() {
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const baseUrl = getApiBaseUrl();

    useEffect(() => {
        async function fetchBlogs() {
            try {
                const res = await fetch(`${baseUrl}/api/blogs`);
                if (res.ok) {
                    const data = await res.json();
                    setBlogs(data);
                }
            } catch (err) {
                console.error('Failed to fetch blogs:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchBlogs();
    }, [baseUrl]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-12 h-12 border-4 border-dnarai-gold-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Insights</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
            {/* Header section */}
            <section className="relative py-24 px-6 overflow-hidden bg-dnarai-navy-900">
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=2070')] bg-cover bg-center" />
                    <div className="absolute inset-0 bg-gradient-to-b from-dnarai-navy-900 via-dnarai-navy-800 to-transparent" />
                </div>

                <div className="container mx-auto max-w-5xl relative z-10 text-center space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-dnarai-gold-400/20 border border-dnarai-gold-400/30 text-dnarai-gold-400 text-xs font-black uppercase tracking-widest">
                        <Lucide.BookOpen size={14} />
                        Dnarai Insights
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-none italic uppercase font-display">
                        Travel <span className="text-dnarai-gold-400">Intelligence</span>
                    </h1>
                    <p className="max-w-2xl mx-auto text-slate-400 text-lg font-medium leading-relaxed">
                        Expert perspectives, destination guides, and the latest updates from the heart of Dnarai Enterprise.
                    </p>
                </div>
            </section>

            {/* Blog Cards Grid */}
            <section className="container mx-auto max-w-6xl px-6 -mt-10 relative z-20">
                {blogs.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-20 text-center shadow-premium border border-slate-100 dark:border-slate-800">
                        <Lucide.Inbox size={48} className="mx-auto text-slate-300 mb-6" />
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic font-display">No stories yet</h3>
                        <p className="text-slate-500 mt-2">Check back soon for premium travel insights.</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {blogs.map((blog) => (
                            <Link
                                key={blog._id}
                                to={`/blog/${blog.slug}`}
                                className="group flex flex-col bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden shadow-card hover:shadow-premium transition-all duration-500 border border-slate-100 dark:border-slate-800 hover:-translate-y-2"
                            >
                                <div className="h-56 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-dnarai-navy-800/20 group-hover:bg-transparent transition-colors duration-500 z-10" />
                                    <img
                                        src={blog.imageUrl || "https://images.unsplash.com/photo-1436491865332-7a61a109c055?auto=format&fit=crop&q=80&w=800"}
                                        alt={blog.title}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = "/D-NARAI_Logo 01.svg";
                                            e.target.className = "w-full h-full object-contain p-8 bg-slate-50 dark:bg-slate-800 group-hover:scale-110 transition-transform duration-700";
                                        }}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                    <div className="absolute top-4 left-4 z-20">
                                        <div className="px-3 py-1 rounded-lg bg-white/90 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-dnarai-navy-900">
                                            {new Date(blog.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 space-y-4 flex-1 flex flex-col">
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight uppercase italic font-display group-hover:text-dnarai-gold-500 transition-colors">
                                        {blog.title}
                                    </h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-3 leading-relaxed">
                                        {blog.content.substring(0, 150)}...
                                    </p>

                                    <div className="pt-4 mt-auto flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-2">
                                            <Lucide.MessageSquare size={14} className="text-slate-400" />
                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                                {blog.comments?.length || 0} Comments
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 text-dnarai-gold-500 text-[10px] font-black uppercase tracking-widest group-hover:gap-3 transition-all">
                                            Read More <Lucide.ChevronRight size={14} />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
