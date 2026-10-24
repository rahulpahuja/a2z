import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import { CalloutNode, CaptionedImage, CollectionCardNode, ComparisonNode, GalleryNode, ProductCardNode, VideoNode } from './blogNodes.jsx';
import { useProducts } from '../../../context/ProductsContext.jsx';
import { subscribeToCollections } from '../../../services/collections.js';
import { uploadBlogImage } from '../../../services/blogMedia.js';
import { CALLOUT_TONES, parseBody, parseVideoSource, safeImageSrc, safeLinkHref, sanitizeDoc } from '../../../utils/blog/doc.js';

const EXTENSIONS = [
  StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: { openOnClick: false, autolink: true, defaultProtocol: 'https' } }),
  CaptionedImage,
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
  CalloutNode,
  ProductCardNode,
  CollectionCardNode,
  ComparisonNode,
  GalleryNode,
  VideoNode,
];

function Btn({ icon, label, onClick, active, disabled }) {
  return (
    <button type="button" className={`be-btn${active ? ' be-btn--on' : ''}`} onClick={onClick} disabled={disabled} aria-label={label} aria-pressed={active ?? undefined} title={label}>
      <span className="material-symbols-outlined" aria-hidden="true">{icon}</span>
    </button>
  );
}

// The article editor. `value` is the stored document (a JSON string); `onChange` receives it as the author types.
// Changing `version` replaces the content from `value` (used when a starter layout is inserted). Product cards
// and comparisons can only be placed for products already chosen for the article (`productIds`).
export default function BlogRichEditor({ value, version = 0, onChange, productIds = [], collectionIds = [] }) {
  const { products } = useProducts();
  const [collections, setCollections] = useState([]);
  const [panel, setPanel] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lastVersion = useRef(version);

  useEffect(() => subscribeToCollections(setCollections), []);

  const editor = useEditor({
    extensions: EXTENSIONS,
    content: sanitizeDoc(parseBody(value)),
    shouldRerenderOnTransaction: true,
    editorProps: { attributes: { class: 'be-content', 'aria-label': 'Article body', role: 'textbox', 'aria-multiline': 'true' } },
    onUpdate: ({ editor: ed }) => onChange(JSON.stringify(ed.getJSON())),
  });

  useEffect(() => {
    if (editor && lastVersion.current !== version) {
      lastVersion.current = version;
      editor.commands.setContent(sanitizeDoc(parseBody(value)));
    }
  }, [editor, version, value]);

  if (!editor) return <div className="be-loading">Loading editor…</div>;

  const chain = () => editor.chain().focus();
  const close = () => {
    setPanel(null);
    setError('');
  };
  const insert = (node) => {
    chain().insertContent(node).run();
    close();
  };
  const nameOf = (id) => products.find((p) => String(p.id) === String(id))?.name || products.find((p) => String(p.id) === String(id))?.title || id;

  const uploadFiles = async (files, onUrl) => {
    setBusy(true);
    setError('');
    try {
      for (const file of files) onUrl(await uploadBlogImage(file));
    } catch (err) {
      setError(err.message || 'Could not upload that image.');
    } finally {
      setBusy(false);
    }
  };

  const submitLink = (event) => {
    event.preventDefault();
    const raw = new FormData(event.currentTarget).get('href');
    if (!String(raw).trim()) {
      chain().extendMarkRange('link').unsetLink().run();
      return close();
    }
    const href = safeLinkHref(raw);
    if (!href) return setError('Use a web address (https://…), an email (mailto:), a phone (tel:) or a page on this site (/products).');
    chain().extendMarkRange('link').setLink({ href }).run();
    return close();
  };

  const submitImage = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get('file');
    const alt = String(form.get('alt') ?? '').trim();
    const caption = String(form.get('caption') ?? '').trim();
    let src = safeImageSrc(form.get('url'));
    if (file && file.size) {
      await uploadFiles([file], (url) => { src = url; });
      if (!src) return;
    }
    if (!src) return setError('Choose an image file or enter an https:// image address.');
    return insert({ type: 'image', attrs: { src, alt, caption } });
  };

  const submitGallery = async (event) => {
    event.preventDefault();
    const files = [...(event.currentTarget.elements.files?.files ?? [])].slice(0, 12);
    if (!files.length) return setError('Choose between 1 and 12 images.');
    const images = [];
    await uploadFiles(files, (url) => images.push({ src: url, alt: '' }));
    return images.length ? insert({ type: 'gallery', attrs: { images } }) : undefined;
  };

  const submitVideo = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const src = String(form.get('url') ?? '').trim();
    if (!parseVideoSource(src)) return setError('Use a YouTube or Vimeo link, or a direct https:// link to an .mp4/.webm file.');
    return insert({ type: 'video', attrs: { src, title: String(form.get('title') ?? '').trim() } });
  };

  const inTable = editor.isActive('table');
  const noProducts = productIds.length === 0;

  return (
    <div className="be">
      <div className="be-toolbar" role="toolbar" aria-label="Formatting">
        <Btn icon="undo" label="Undo" onClick={() => chain().undo().run()} disabled={!editor.can().undo()} />
        <Btn icon="redo" label="Redo" onClick={() => chain().redo().run()} disabled={!editor.can().redo()} />
        <span className="be-sep" />
        <Btn icon="format_h2" label="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => chain().toggleHeading({ level: 2 }).run()} />
        <Btn icon="format_h3" label="Heading 3" active={editor.isActive('heading', { level: 3 })} onClick={() => chain().toggleHeading({ level: 3 }).run()} />
        <Btn icon="format_h4" label="Heading 4" active={editor.isActive('heading', { level: 4 })} onClick={() => chain().toggleHeading({ level: 4 }).run()} />
        <span className="be-sep" />
        <Btn icon="format_bold" label="Bold" active={editor.isActive('bold')} onClick={() => chain().toggleBold().run()} />
        <Btn icon="format_italic" label="Italic" active={editor.isActive('italic')} onClick={() => chain().toggleItalic().run()} />
        <Btn icon="format_underlined" label="Underline" active={editor.isActive('underline')} onClick={() => chain().toggleUnderline().run()} />
        <Btn icon="strikethrough_s" label="Strikethrough" active={editor.isActive('strike')} onClick={() => chain().toggleStrike().run()} />
        <Btn icon="link" label="Link" active={editor.isActive('link')} onClick={() => setPanel('link')} />
        <span className="be-sep" />
        <Btn icon="format_list_bulleted" label="Bulleted list" active={editor.isActive('bulletList')} onClick={() => chain().toggleBulletList().run()} />
        <Btn icon="format_list_numbered" label="Numbered list" active={editor.isActive('orderedList')} onClick={() => chain().toggleOrderedList().run()} />
        <Btn icon="format_quote" label="Quote" active={editor.isActive('blockquote')} onClick={() => chain().toggleBlockquote().run()} />
        <Btn icon="horizontal_rule" label="Divider" onClick={() => chain().setHorizontalRule().run()} />
        <span className="be-sep" />
        <Btn icon="image" label="Image" onClick={() => setPanel('image')} />
        <Btn icon="photo_library" label="Image gallery" onClick={() => setPanel('gallery')} />
        <Btn icon="movie" label="Video" onClick={() => setPanel('video')} />
        <Btn icon="table" label="Insert table" onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
        <Btn icon="priority_high" label="Callout" active={editor.isActive('callout')} onClick={() => setPanel('callout')} />
        <span className="be-sep" />
        <Btn icon="shopping_bag" label="Product card" onClick={() => setPanel('product')} />
        <Btn icon="collections_bookmark" label="Collection card" onClick={() => setPanel('collection')} />
        <Btn icon="compare" label="Comparison table" onClick={() => setPanel('comparison')} />
      </div>

      {inTable && (
        <div className="be-toolbar be-toolbar--sub" role="toolbar" aria-label="Table">
          <button type="button" className="be-chip" onClick={() => chain().addRowAfter().run()}>Add row</button>
          <button type="button" className="be-chip" onClick={() => chain().addColumnAfter().run()}>Add column</button>
          <button type="button" className="be-chip" onClick={() => chain().deleteRow().run()}>Delete row</button>
          <button type="button" className="be-chip" onClick={() => chain().deleteColumn().run()}>Delete column</button>
          <button type="button" className="be-chip be-chip--danger" onClick={() => chain().deleteTable().run()}>Delete table</button>
        </div>
      )}

      {panel && (
        <div className="be-panel" role="group" aria-label="Insert">
          {panel === 'link' && (
            <form onSubmit={submitLink} className="be-form">
              <label>Link address<input name="href" defaultValue={editor.getAttributes('link').href ?? ''} placeholder="https://… or /products (empty removes the link)" autoFocus /></label>
              <button type="submit" className="be-go">Apply</button>
            </form>
          )}
          {panel === 'image' && (
            <form onSubmit={submitImage} className="be-form">
              <label>Upload an image<input name="file" type="file" accept="image/*,.heic,.heif" /></label>
              <label>…or image address<input name="url" placeholder="https://…" /></label>
              <label>Description (alt text)<input name="alt" placeholder="Describe the picture for people who cannot see it" /></label>
              <label>Caption (optional)<input name="caption" /></label>
              <button type="submit" className="be-go" disabled={busy}>{busy ? 'Uploading…' : 'Insert image'}</button>
            </form>
          )}
          {panel === 'gallery' && (
            <form onSubmit={submitGallery} className="be-form">
              <label>Choose up to 12 images<input name="files" type="file" accept="image/*,.heic,.heif" multiple /></label>
              <button type="submit" className="be-go" disabled={busy}>{busy ? 'Uploading…' : 'Insert gallery'}</button>
            </form>
          )}
          {panel === 'video' && (
            <form onSubmit={submitVideo} className="be-form">
              <label>Video link<input name="url" placeholder="YouTube, Vimeo or https://…/clip.mp4" autoFocus /></label>
              <label>Title (for screen readers)<input name="title" /></label>
              <button type="submit" className="be-go">Insert video</button>
            </form>
          )}
          {panel === 'callout' && (
            <div className="be-form">
              <span>Highlight the selected text as:</span>
              {CALLOUT_TONES.map((tone) => (
                <button key={tone} type="button" className="be-chip" onClick={() => { chain().setCallout(tone).run(); close(); }}>{tone}</button>
              ))}
              {editor.isActive('callout') && <button type="button" className="be-chip be-chip--danger" onClick={() => { chain().unsetCallout().run(); close(); }}>Remove callout</button>}
            </div>
          )}
          {panel === 'product' && (
            <div className="be-form">
              {noProducts ? <p className="be-hint">Choose the article's products first (Products &amp; collections), then place them here.</p> : (
                <>
                  <span>Place a product card for:</span>
                  {productIds.map((id) => <button key={id} type="button" className="be-chip" onClick={() => insert({ type: 'productCard', attrs: { productId: String(id) } })}>{nameOf(id)}</button>)}
                </>
              )}
            </div>
          )}
          {panel === 'collection' && (
            <div className="be-form">
              {collectionIds.length === 0 ? <p className="be-hint">Choose a collection for the article first (Products &amp; collections).</p> : (
                <>
                  <span>Place a collection card for:</span>
                  {collectionIds.map((id) => <button key={id} type="button" className="be-chip" onClick={() => insert({ type: 'collectionCard', attrs: { collectionId: id } })}>{collections.find((c) => c.id === id)?.name ?? id}</button>)}
                </>
              )}
            </div>
          )}
          {panel === 'comparison' && (
            <div className="be-form">
              {productIds.length < 2 ? <p className="be-hint">A comparison needs at least two of the article's products.</p> : (
                <>
                  <span>Compare (up to 4, in this order):</span>
                  <button type="button" className="be-go" onClick={() => insert({ type: 'comparison', attrs: { productIds: productIds.slice(0, 4).map(String) } })}>
                    {productIds.slice(0, 4).map(nameOf).join(' · ')}
                  </button>
                </>
              )}
            </div>
          )}
          {error && <p className="be-error" role="alert">{error}</p>}
          <button type="button" className="be-close" onClick={close}>Cancel</button>
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}
