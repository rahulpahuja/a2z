import { useEffect, useState } from 'react';
import { Node, NodeViewWrapper, ReactNodeViewRenderer, mergeAttributes } from '@tiptap/react';
import Image from '@tiptap/extension-image';
import { useProducts } from '../../../context/ProductsContext.jsx';
import { subscribeToCollections } from '../../../services/collections.js';

// The custom blocks of the article editor. Each is an "atom": one block the author places, moves or deletes
// as a whole. They store only ids (never prices or names), so the public page always shows live catalogue data.

function Chip({ icon, title, detail, onRemove, selected }) {
  return (
    <NodeViewWrapper className={`bn-block${selected ? ' bn-block--selected' : ''}`} contentEditable={false} data-drag-handle>
      <span className="material-symbols-outlined bn-block__icon" aria-hidden="true">{icon}</span>
      <span className="bn-block__text"><strong>{title}</strong>{detail && <small>{detail}</small>}</span>
      <button type="button" className="bn-block__remove" onClick={onRemove} aria-label={`Remove ${title}`}>
        <span className="material-symbols-outlined" aria-hidden="true">close</span>
      </button>
    </NodeViewWrapper>
  );
}

function useProductNames(ids) {
  const { products } = useProducts();
  return ids.map((id) => products.find((p) => String(p.id) === String(id))?.name || products.find((p) => String(p.id) === String(id))?.title || null);
}

function ProductView({ node, deleteNode, selected }) {
  const [name] = useProductNames([node.attrs.productId]);
  return <Chip icon="shopping_bag" title={name ? `Product card: ${name}` : 'Product card (product not found)'} detail="Shows the live price and availability" onRemove={deleteNode} selected={selected} />;
}

function CollectionView({ node, deleteNode, selected }) {
  const [rows, setRows] = useState([]);
  useEffect(() => subscribeToCollections(setRows), []);
  const name = rows.find((c) => c.id === node.attrs.collectionId)?.name;
  return <Chip icon="collections_bookmark" title={name ? `Collection card: ${name}` : 'Collection card (collection not found)'} onRemove={deleteNode} selected={selected} />;
}

function ComparisonView({ node, deleteNode, selected }) {
  const names = useProductNames(node.attrs.productIds).filter(Boolean);
  return <Chip icon="compare" title="Comparison table" detail={names.length ? names.join(' · ') : 'Uses all products selected for the article'} onRemove={deleteNode} selected={selected} />;
}

function GalleryView({ node, deleteNode, selected }) {
  return <Chip icon="photo_library" title={`Image gallery (${node.attrs.images.length})`} detail={node.attrs.images.map((i) => i.alt || 'image').slice(0, 3).join(' · ')} onRemove={deleteNode} selected={selected} />;
}

function VideoView({ node, deleteNode, selected }) {
  return <Chip icon="movie" title={node.attrs.title || 'Video'} detail={node.attrs.src} onRemove={deleteNode} selected={selected} />;
}

function atom(name, attrs, View) {
  const attributes = Object.fromEntries(Object.entries(attrs).map(([key, value]) => [key, { default: value, rendered: false }]));
  return Node.create({
    name,
    group: 'block',
    atom: true,
    draggable: true,
    selectable: true,
    addAttributes: () => attributes,
    parseHTML: () => [{ tag: `div[data-blog-node="${name}"]` }],
    renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes, { 'data-blog-node': name })],
    addNodeView: () => ReactNodeViewRenderer(View),
  });
}

export const ProductCardNode = atom('productCard', { productId: '' }, ProductView);
export const CollectionCardNode = atom('collectionCard', { collectionId: '' }, CollectionView);
export const ComparisonNode = atom('comparison', { productIds: [] }, ComparisonView);
export const GalleryNode = atom('gallery', { images: [] }, GalleryView);
export const VideoNode = atom('video', { src: '', title: '' }, VideoView);

export const CalloutNode = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes: () => ({ tone: { default: 'info', rendered: false } }),
  parseHTML: () => [{ tag: 'aside[data-blog-node="callout"]' }],
  renderHTML: ({ HTMLAttributes, node }) => ['aside', mergeAttributes(HTMLAttributes, { 'data-blog-node': 'callout', class: `bn-callout bn-callout--${node.attrs.tone}` }), 0],
  addCommands() {
    return {
      setCallout: (tone) => ({ commands }) => commands.wrapIn(this.name, { tone }),
      unsetCallout: () => ({ commands }) => commands.lift(this.name),
    };
  },
});

// Images carry a caption in addition to the usual src and alt.
export const CaptionedImage = Image.extend({
  addAttributes() {
    return { ...this.parent?.(), caption: { default: '', rendered: false } };
  },
});
