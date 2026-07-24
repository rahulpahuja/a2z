import { useState } from 'react';
import { Link } from 'react-router-dom';
import { WHATSAPP_NUMBER } from '../config/store.js';
import { buildWhatsAppLink } from '../utils/whatsapp.js';
import { useToast } from '../context/ToastContext.jsx';
import SiteFooter from '../components/SiteFooter.jsx';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(2000, 0, 1, hours, minutes);
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function todayIsoDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export default function StoreAppointmentPage() {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!date || !time) {
      showToast('Please choose a date and time for your visit.');
      return;
    }

    const greeting = name.trim() ? `Hi, I'm ${name.trim()}.` : 'Hi,';
    const message = `${greeting} I am planning to come to your store on ${formatDate(date)} at ${formatTime(time)}. Please let me know if that works!`;

    window.open(buildWhatsAppLink(WHATSAPP_NUMBER, message), '_blank', 'noopener,noreferrer');
    showToast('Opening WhatsApp — just hit send to confirm your visit.');
  };

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

      <main className="max-w-xl mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-16">
        <div className="text-center mb-10">
          <span className="font-label-caps text-label-caps text-primary uppercase tracking-widest">Visit Us</span>
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mt-3 mb-4 playfair">
            Book a Store Appointment
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Pick a date and time that works for you. We'll open WhatsApp with your visit details ready to send to
            our store.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 bg-surface-container-low border border-tertiary-container/30 rounded-xl p-6 md:p-8">
          <div className="flex flex-col gap-2">
            <label className="font-label-caps text-label-caps text-on-surface-variant" htmlFor="appointment-name">
              Your Name (optional)
            </label>
            <input
              id="appointment-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="bg-transparent border-b border-outline focus:border-primary focus:ring-0 outline-none py-2 font-body-sm text-body-sm text-on-surface transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex flex-col gap-2">
              <label className="font-label-caps text-label-caps text-on-surface-variant" htmlFor="appointment-date">
                Date
              </label>
              <input
                id="appointment-date"
                type="date"
                required
                min={todayIsoDate()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent border border-outline rounded-lg focus:border-primary focus:ring-0 outline-none py-2 px-3 font-body-sm text-body-sm text-on-surface transition-colors"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-label-caps text-label-caps text-on-surface-variant" htmlFor="appointment-time">
                Time
              </label>
              <input
                id="appointment-time"
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="bg-transparent border border-outline rounded-lg focus:border-primary focus:ring-0 outline-none py-2 px-3 font-body-sm text-body-sm text-on-surface transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            className="flex items-center justify-center gap-2 bg-primary text-on-primary font-label-caps text-label-caps py-4 rounded-xl uppercase tracking-widest hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[18px]">chat</span>
            Confirm via WhatsApp
          </button>
        </form>
      </main>

      <SiteFooter />
    </>
  );
}
