import { useId, useMemo, useState } from 'react';
import ProductDescription from '../ProductDescription.jsx';
import { applyDescriptionChanges, diffDescription, formatDescription } from '../../utils/descriptionFormat.js';
import { analyzeDescription } from '../../utils/descriptionSeo.js';
import './DescriptionAssistant.css';

const STATUS_LABEL = { pass: 'Pass', warn: 'Review', fail: 'Fix' };
const NO_REJECTIONS = new Set();

function ChangeLines({ lines, emptyLabel }) {
  if (lines.length === 0) return <p className="description-assistant__empty-lines">{emptyLabel}</p>;
  return (
    <pre className="description-assistant__lines">
      {lines.map((line, index) => (
        <span key={index} className="description-assistant__line">{line === '' ? ' ' : line}</span>
      ))}
    </pre>
  );
}

/**
 * Rules-based "Format & improve" helper shown under the description textarea.
 * It only ever calls onApply with new text; saving stays the form's own action.
 *
 * `product` carries what the checklist compares against:
 * { title, categoryTitle, hashtags, colors, sizes, gender }.
 */
export default function DescriptionAssistant({ value, onApply, product }) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [rejection, setRejection] = useState({ base: null, ids: NO_REJECTIONS });
  const [undoValue, setUndoValue] = useState(null);

  const formatted = useMemo(() => formatDescription(value), [value]);
  const segments = useMemo(() => diffDescription(value, formatted), [value, formatted]);
  const changes = useMemo(() => segments.filter((segment) => segment.type === 'change'), [segments]);

  // Rejections belong to one version of the text; a different value starts fresh.
  const rejected = rejection.base === value ? rejection.ids : NO_REJECTIONS;
  const accepted = changes.filter((change) => !rejected.has(change.id));
  const result = useMemo(() => applyDescriptionChanges(segments, (id) => !rejected.has(id)), [segments, rejected]);
  const analysis = useMemo(() => analyzeDescription(result, product), [result, product]);

  const toggle = (id) => {
    const next = new Set(rejected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setRejection({ base: value, ids: next });
  };

  const apply = () => {
    setUndoValue(value);
    onApply(result);
  };

  const undo = () => {
    onApply(undoValue);
    setUndoValue(null);
  };

  const hasText = value.trim().length > 0;

  return (
    <div className="description-assistant">
      <div className="description-assistant__bar">
        <button
          type="button"
          className="description-assistant__trigger"
          aria-expanded={open}
          aria-controls={panelId}
          disabled={!hasText && !open}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? 'Close assistant' : 'Format & improve'}
        </button>
        {undoValue !== null && (
          <button type="button" className="description-assistant__undo" onClick={undo}>
            Undo last apply
          </button>
        )}
        {!hasText && !open && <span className="description-assistant__hint">Write a description first.</span>}
      </div>

      {open && (
        <section id={panelId} className="description-assistant__panel" aria-label="Description assistant">
          <p className="description-assistant__note">
            Rules-based tidy-up: spacing, capitals, punctuation, list formatting and a few British spellings. Nothing is saved until you save the product.
          </p>

          <h4 className="description-assistant__heading">Suggested changes</h4>
          {changes.length === 0 ? (
            <p className="description-assistant__status" role="status">
              {hasText ? 'No formatting changes suggested.' : 'Nothing to format yet.'}
            </p>
          ) : (
            <>
              <ol className="description-assistant__changes">
                {changes.map((change, index) => {
                  const isRejected = rejected.has(change.id);
                  return (
                    <li
                      key={change.id}
                      className={`description-assistant__change${isRejected ? ' description-assistant__change--rejected' : ''}`}
                    >
                      <div className="description-assistant__change-head">
                        <span className="description-assistant__change-title">Change {index + 1}</span>
                        <button
                          type="button"
                          className="description-assistant__toggle"
                          aria-pressed={!isRejected}
                          onClick={() => toggle(change.id)}
                        >
                          {isRejected ? 'Rejected (click to accept)' : 'Accepted (click to reject)'}
                        </button>
                      </div>
                      <div className="description-assistant__compare">
                        <div className="description-assistant__side">
                          <span className="description-assistant__side-label">Before</span>
                          <ChangeLines lines={change.before} emptyLabel="(nothing)" />
                        </div>
                        <div className="description-assistant__side description-assistant__side--after">
                          <span className="description-assistant__side-label">After</span>
                          <ChangeLines lines={change.after} emptyLabel="(removed)" />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <button
                type="button"
                className="description-assistant__apply"
                disabled={accepted.length === 0}
                onClick={apply}
              >
                {`Apply ${accepted.length} change${accepted.length === 1 ? '' : 's'}`}
              </button>
            </>
          )}

          <h4 className="description-assistant__heading">SEO checklist</h4>
          <ul className="description-assistant__checks">
            {analysis.checks.map((check) => (
              <li key={check.id} className={`description-assistant__check description-assistant__check--${check.status}`}>
                <span className="description-assistant__badge">{STATUS_LABEL[check.status]}</span>
                <div className="description-assistant__check-body">
                  <span className="description-assistant__check-label">{check.label}</span>
                  <span className="description-assistant__check-message">{check.message}</span>
                  {check.items?.length > 0 && (
                    <ul className="description-assistant__findings">
                      {check.items.map((item) => (
                        <li key={`${item.type}-${item.term}`}>{item.message}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="description-assistant__note">
            The checklist reads the text as it will be after the accepted changes. It is a guide, not a ranking promise.
          </p>

          <h4 className="description-assistant__heading">Storefront preview</h4>
          <div className="description-assistant__preview">
            {result.trim() ? <ProductDescription text={result} /> : <p className="description-assistant__empty-lines">Nothing to preview.</p>}
          </div>
        </section>
      )}
    </div>
  );
}
