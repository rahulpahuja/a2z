import { Fragment, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { extractHeadings, nodeText, parseVideoSource, sanitizeDoc } from '../../utils/blog/doc.js';
import { BlogCollectionCard, BlogProductCard } from './BlogCards.jsx';
import BlogComparison from './BlogComparison.jsx';

const CALLOUT_ICONS = { info: 'info', tip: 'lightbulb', warning: 'warning', note: 'sticky_note_2' };

// Applies marks (bold, italic, link…) around a text node.
function renderText(node, key) {
  let out = node.text;
  for (const mark of node.marks ?? []) {
    if (mark.type === 'bold') out = <strong key={`${key}b`}>{out}</strong>;
    else if (mark.type === 'italic') out = <em key={`${key}i`}>{out}</em>;
    else if (mark.type === 'underline') out = <u key={`${key}u`}>{out}</u>;
    else if (mark.type === 'strike') out = <s key={`${key}s`}>{out}</s>;
    else if (mark.type === 'code') out = <code key={`${key}c`}>{out}</code>;
    else if (mark.type === 'link') {
      const { href } = mark.attrs;
      const internal = href.startsWith('/') || href.startsWith('#');
      out = href.startsWith('/') ? (
        <Link key={`${key}l`} to={href}>{out}</Link>
      ) : (
        <a key={`${key}l`} href={href} {...(internal ? {} : { target: '_blank', rel: 'noopener noreferrer' })}>{out}</a>
      );
    }
  }
  return out;
}

function Video({ src, title }) {
  const source = parseVideoSource(src);
  if (!source) return null;
  if (source.kind === 'file') {
    return <video className="blog-video" controls preload="metadata" playsInline src={source.src} aria-label={title || 'Video'} />;
  }
  const embed = source.kind === 'youtube' ? `https://www.youtube-nocookie.com/embed/${source.id}` : `https://player.vimeo.com/video/${source.id}`;
  return (
    <div className="blog-embed">
      <iframe
        src={embed}
        title={title || 'Video'}
        loading="lazy"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}

// Renders a sanitized document. Nothing here ever builds HTML from a string: every node type is an
// explicit React element, so a document can only produce the elements listed below.
export default function BlogRenderer({ doc, post }) {
  const clean = useMemo(() => sanitizeDoc(doc), [doc]);
  const headings = useMemo(() => extractHeadings(clean), [clean]);
  const defaultCompare = post?.productIds ?? [];

  let headingIndex = 0;
  const renderNode = (node, key) => {
    const children = () => (node.content ?? []).map((child, i) => renderNode(child, `${key}.${i}`));
    switch (node.type) {
      case 'text':
        return <Fragment key={key}>{renderText(node, key)}</Fragment>;
      case 'hardBreak':
        return <br key={key} />;
      case 'paragraph':
        return <p key={key}>{children()}</p>;
      case 'heading': {
        const Tag = `h${node.attrs.level}`;
        const id = nodeText(node).trim() ? headings[headingIndex++]?.id : undefined;
        return <Tag key={key} id={id}>{children()}</Tag>;
      }
      case 'bulletList':
        return <ul key={key}>{children()}</ul>;
      case 'orderedList':
        return <ol key={key} start={node.attrs?.start}>{children()}</ol>;
      case 'listItem':
        return <li key={key}>{children()}</li>;
      case 'blockquote':
        return <blockquote key={key}>{children()}</blockquote>;
      case 'codeBlock':
        return <pre key={key}><code>{nodeText(node)}</code></pre>;
      case 'horizontalRule':
        return <hr key={key} />;
      case 'table':
        return (
          <div key={key} className="blog-table-wrap" role="region" aria-label="Table" tabIndex={0}>
            <table><tbody>{children()}</tbody></table>
          </div>
        );
      case 'tableRow':
        return <tr key={key}>{children()}</tr>;
      case 'tableHeader':
        return <th key={key} scope="col" colSpan={node.attrs.colspan} rowSpan={node.attrs.rowspan}>{children()}</th>;
      case 'tableCell':
        return <td key={key} colSpan={node.attrs.colspan} rowSpan={node.attrs.rowspan}>{children()}</td>;
      case 'callout':
        return (
          <aside key={key} className={`blog-callout blog-callout--${node.attrs.tone}`} role="note">
            <span className="material-symbols-outlined" aria-hidden="true">{CALLOUT_ICONS[node.attrs.tone]}</span>
            <div>{children()}</div>
          </aside>
        );
      case 'image':
        return (
          <figure key={key} className="blog-figure">
            <img src={node.attrs.src} alt={node.attrs.alt} loading="lazy" decoding="async" />
            {node.attrs.caption && <figcaption>{node.attrs.caption}</figcaption>}
          </figure>
        );
      case 'gallery':
        return (
          <div key={key} className={`blog-gallery blog-gallery--${Math.min(node.attrs.images.length, 3)}`}>
            {node.attrs.images.map((img, i) => (
              <img key={i} src={img.src} alt={img.alt} loading="lazy" decoding="async" />
            ))}
          </div>
        );
      case 'video':
        return <Video key={key} src={node.attrs.src} title={node.attrs.title} />;
      case 'productCard':
        return <BlogProductCard key={key} productId={node.attrs.productId} placement="inline" />;
      case 'collectionCard':
        return <BlogCollectionCard key={key} collectionId={node.attrs.collectionId} />;
      case 'comparison':
        return <BlogComparison key={key} productIds={node.attrs.productIds.length ? node.attrs.productIds : defaultCompare.slice(0, 4)} />;
      default:
        return null;
    }
  };

  return <div className="blog-body">{clean.content.map((node, i) => renderNode(node, String(i)))}</div>;
}
