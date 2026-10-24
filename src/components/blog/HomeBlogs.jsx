import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BlogCard from './BlogCard.jsx';
import { subscribeToBlogIndex, subscribeToCategories } from '../../services/blog.js';
import { logBlogCardClick } from '../../services/analytics.js';
import './blog.css';

export const HOME_BLOG_COUNT = 3;

// The latest published articles for the home page. Shows nothing until at least one article is
// published (or if the list cannot be read), so an empty journal never leaves a blank band.
export default function HomeBlogs() {
  const [entries, setEntries] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => subscribeToBlogIndex(setEntries, () => setEntries([])), []);
  useEffect(() => subscribeToCategories(setCategories), []);

  if (entries.length === 0) return null;

  const categoryName = (id) => categories.find((c) => c.id === id)?.name ?? '';
  return (
    <section
      aria-labelledby="home-blogs-title"
      className="py-10 md:py-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto border-b border-outline-variant/10 w-full max-w-full overflow-hidden"
    >
      <div className="flex justify-between items-center mb-6 md:mb-12 gap-2">
        <h2 id="home-blogs-title" className="font-headline-md-mobile text-headline-md-mobile md:font-headline-md md:text-headline-md playfair text-on-surface">
          From the Journal
        </h2>
        <Link
          to="/blogs"
          className="font-label-caps text-[0.6875rem] md:text-label-caps text-primary hover:underline uppercase tracking-wider flex items-center gap-1 shrink-0"
        >
          View All
          <span className="material-symbols-outlined text-[1rem] md:text-[1.125rem]">arrow_forward</span>
        </Link>
      </div>
      <div className="blog-frame">
        <div className="blog-grid">
          {entries.slice(0, HOME_BLOG_COUNT).map((entry) => (
            <BlogCard key={entry.id} entry={entry} categoryName={categoryName(entry.categoryId)} onOpen={(e) => logBlogCardClick(e, 'home')} />
          ))}
        </div>
      </div>
    </section>
  );
}
