import { useState } from 'react';
import { Link } from 'react-router-dom';
import SiteFooter from '../components/SiteFooter.jsx';

function toCm(inches) {
  return Math.round(inches * 2.54);
}

function buildRows(sizes, columns) {
  return sizes.map((size) => {
    const row = { size: size.label };
    columns.forEach((col) => {
      row[col.key] = size[col.key];
    });
    return row;
  });
}

const WOMEN_COLUMNS = [
  { key: 'bust', label: 'Bust' },
  { key: 'waist', label: 'Waist' },
  { key: 'hip', label: 'Hip' },
];

const WOMEN_SIZES_IN = [
  { label: 'XS', bust: 32, waist: 26, hip: 35 },
  { label: 'S', bust: 34, waist: 28, hip: 37 },
  { label: 'M', bust: 36, waist: 30, hip: 39 },
  { label: 'L', bust: 38, waist: 32, hip: 41 },
  { label: 'XL', bust: 40, waist: 34, hip: 43 },
  { label: 'XXL', bust: 42, waist: 36, hip: 45 },
];

const MEN_COLUMNS = [
  { key: 'chest', label: 'Chest' },
  { key: 'waist', label: 'Waist' },
  { key: 'shoulder', label: 'Shoulder' },
];

const MEN_SIZES_IN = [
  { label: 'S', chest: 36, waist: 30, shoulder: 17 },
  { label: 'M', chest: 38, waist: 32, shoulder: 17.5 },
  { label: 'L', chest: 40, waist: 34, shoulder: 18 },
  { label: 'XL', chest: 42, waist: 36, shoulder: 18.5 },
  { label: 'XXL', chest: 44, waist: 38, shoulder: 19 },
  { label: 'XXXL', chest: 46, waist: 40, shoulder: 19.5 },
];

const CHARTS = {
  women: { label: "Women's", columns: WOMEN_COLUMNS, rowsIn: WOMEN_SIZES_IN },
  men: { label: "Men's", columns: MEN_COLUMNS, rowsIn: MEN_SIZES_IN },
};

function SizeTable({ chart, unit }) {
  const rows = buildRows(chart.rowsIn, chart.columns);
  return (
    <div className="overflow-x-auto rounded-xl border border-outline-variant/30">
      <table className="w-full text-left border-collapse min-w-[420px]">
        <thead>
          <tr className="bg-surface-container">
            <th className="font-label-caps text-label-caps text-on-surface uppercase tracking-wider px-4 py-3">Size</th>
            {chart.columns.map((col) => (
              <th key={col.key} className="font-label-caps text-label-caps text-on-surface uppercase tracking-wider px-4 py-3">
                {col.label} ({unit})
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.size} className="border-t border-outline-variant/20">
              <td className="font-title-sm text-title-sm text-on-surface px-4 py-3">{row.size}</td>
              {chart.columns.map((col) => (
                <td key={col.key} className="font-body-sm text-body-sm text-on-surface-variant px-4 py-3">
                  {unit === 'cm' ? toCm(row[col.key]) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SizeChartPage() {
  const [activeChart, setActiveChart] = useState('women');
  const [unit, setUnit] = useState('in');

  return (
    <>
      <header className="w-full px-margin-mobile md:px-margin-desktop py-4 bg-surface border-b border-surface-variant flex justify-between items-center max-w-container-max mx-auto">
        <Link to="/" className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim">
          A2Z Collection
        </Link>
        <Link to="/" className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors">
          Back to Home
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-16">
        <div className="text-center mb-10">
          <span className="font-label-caps text-label-caps text-primary uppercase tracking-widest">Fit Guide</span>
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mt-3 mb-4 playfair">
            Size Chart
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Measurements are approximate — for the most accurate fit, compare against a similar garment you
            already own.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex gap-2 bg-surface-container rounded-full p-1">
            {Object.entries(CHARTS).map(([key, chart]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveChart(key)}
                className={`px-5 py-2 rounded-full font-label-caps text-label-caps uppercase transition-colors ${
                  activeChart === key ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                {chart.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 bg-surface-container rounded-full p-1">
            {['in', 'cm'].map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={`px-4 py-2 rounded-full font-label-caps text-label-caps uppercase transition-colors ${
                  unit === u ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        <SizeTable chart={CHARTS[activeChart]} unit={unit} />

        <p className="font-body-sm text-body-sm text-on-surface-variant mt-6">
          Still unsure which size to pick? <Link to="/contact-us" className="text-primary hover:underline">Contact us</Link> and
          we'll help you find the right fit.
        </p>
      </main>

      <SiteFooter />
    </>
  );
}
