import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { formatCurrency } from '../../context/CartContext.jsx';

export default function BarcodeModal({ product, onClose }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current) {
      JsBarcode(canvasRef.current, product.sku, {
        format: 'CODE128',
        width: 2,
        height: 60,
        fontSize: 14,
        margin: 10,
      });
    }
  }, [product.sku]);

  return (
    <div className="fixed inset-0 z-[300] bg-on-surface/60 backdrop-blur-sm flex items-center justify-center p-4 barcode-modal-overlay">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .barcode-label, .barcode-label * { visibility: visible; }
          .barcode-label { position: fixed; top: 40px; left: 50%; transform: translateX(-50%); }
          .barcode-modal-overlay { background: none !important; backdrop-filter: none !important; position: static !important; }
        }
      `}</style>
      <div className="bg-surface w-full max-w-sm rounded-2xl shadow-xl p-8 relative">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-4 right-4 text-on-surface-variant hover:text-primary transition-colors print:hidden"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="barcode-label flex flex-col items-center gap-2 text-center">
          <p className="font-title-sm text-title-sm text-on-surface">{product.title}</p>
          <p className="font-body-sm text-body-sm text-on-surface-variant">{formatCurrency(product.price)}</p>
          <canvas ref={canvasRef} />
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="w-full mt-6 bg-primary text-on-primary font-label-caps text-label-caps py-3 rounded-lg uppercase tracking-widest hover:opacity-90 transition-opacity print:hidden"
        >
          Print Label
        </button>
      </div>
    </div>
  );
}
