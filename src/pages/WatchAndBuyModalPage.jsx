import { getHighResUrl } from '../utils/image.js';
import './WatchAndBuyModalPage.css';

const SIZES = ['S', 'M', 'L'];
const SELECTED_SIZE = 'M';

export default function WatchAndBuyModalPage() {
  return (
    <div className="bg-surface text-on-surface font-body-lg overflow-hidden relative min-h-screen">
      {/* Storefront Background (Blurred out by overlay) */}
      <div className="absolute inset-0 z-0">
        <div
          className="bg-cover bg-center w-full h-full opacity-30 grayscale-[20%]"
          data-alt="A vibrant, elegant storefront of an Indian fashion boutique. Racks of colorful saris and kurtis are visible in the background, out of focus. The lighting is bright and airy, reflecting a modern light-mode luxury aesthetic with touches of hot pink and dusty rose."
            style={{
              backgroundImage:
                `url('${getHighResUrl('https://lh3.googleusercontent.com/aida-public/AB6AXuC6qgYfjtimmwYyydsrOURYTpahNEr6OfI4hitvTIQv4EXuRukfDrf6QT96hxjANDMpfeW9Sb_9l6tTlYUQXEdvJCbW487pQQAPsjh7keCBm0El1ma9gEVmZvE1GEaPhJOAYrMEKeRjFgt_3QfJ9P_kVp8Am0T3xwXqNKc6o5jA_QNHfTVbJ_MRQiiYIkf828BRgrKwEki5emiLorSb3m5rbPzDdZbIR_YP0ENdAg7O3rj3lEKHN9n1Gw')}')`,
            }}
        ></div>
      </div>
      {/* Modal Overlay */}
      <div className="fixed inset-0 bg-black/70 modal-overlay z-40 flex items-center justify-center p-4 md:p-8">
        {/* Navigation Controls (Outside Modal) */}
        <button className="absolute left-4 md:left-margin-desktop top-1/2 -translate-y-1/2 text-white hover:text-primary-container transition-colors p-2 rounded-full hover:bg-white/10 z-50 group">
          <span className="material-symbols-outlined text-4xl group-hover:scale-110 transition-transform">
            chevron_left
          </span>
        </button>
        <button className="absolute right-4 md:right-margin-desktop top-1/2 -translate-y-1/2 text-white hover:text-primary-container transition-colors p-2 rounded-full hover:bg-white/10 z-50 group">
          <span className="material-symbols-outlined text-4xl group-hover:scale-110 transition-transform">
            chevron_right
          </span>
        </button>
        {/* Close Button */}
        <button className="absolute top-4 right-4 md:top-8 md:right-8 text-white hover:text-primary-container transition-colors p-2 rounded-full hover:bg-white/10 z-50">
          <span className="material-symbols-outlined text-3xl">close</span>
        </button>
        {/* Counter */}
        <div className="absolute bottom-4 right-4 md:bottom-8 md:right-margin-desktop text-white font-label-caps text-label-caps tracking-widest z-50">
          2 / 6
        </div>
        {/* Main Modal Container */}
        <div className="w-full max-w-[1000px] h-[80vh] md:h-[600px] bg-surface rounded-[16px] overflow-hidden flex flex-col md:flex-row relative z-50 shadow-[0_10px_30px_rgba(172,36,113,0.15)] border border-tertiary/30">
          {/* Left Side: Video Player (60%) */}
          <div className="w-full md:w-[60%] h-[50%] md:h-full relative bg-inverse-surface group">
            {/* Video Placeholder */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              data-alt="A high-fashion video still of a model wearing a vibrant, intricately embroidered lehenga. The fabric catches the light, showing off traditional Indian craftsmanship. The background is a minimalist studio setting with soft lighting to emphasize the garment's luxury details. The overall color palette leans towards rich jewel tones and dusty rose accents."
              style={{
                backgroundImage:
                  `url('${getHighResUrl('https://lh3.googleusercontent.com/aida-public/AB6AXuAsro22j_6rJuYnFYHyPkQZFHbgHwCBbu5P_rNqgnJXzH1BHkUSXGd7xqhYrt7gelPBxolC586tCR92l-PfbmBqr5hr1QDfBk_NsA9uN1Sk8Z9ei-maaaslAujq1JCzB2BkQ3Vz4z1elHdpCwzQXEpA2spIYgt0DWCybLMS-Fnedhz8rhtGNPVx22J8n2SoooHR7j8w4absh9jg88DpaWodzeSL9TYcVXOVybYKd9ofUWMk2zM-FT9qsg')}')`,
              }}
            ></div>
            {/* Playback Controls Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
              {/* Progress Bar */}
              <div className="w-full h-1 bg-white/30 rounded-full mb-4 cursor-pointer relative">
                <div className="absolute top-0 left-0 h-full bg-primary-container rounded-full w-1/3"></div>
                {/* Playhead */}
                <div className="absolute top-1/2 -translate-y-1/2 left-1/3 w-3 h-3 bg-white rounded-full shadow-md"></div>
              </div>
              <div className="flex justify-between items-center text-white">
                <div className="flex items-center gap-4">
                  <button className="hover:text-primary-container transition-colors">
                    <span
                      className="material-symbols-outlined"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      pause
                    </span>
                  </button>
                  <button className="hover:text-primary-container transition-colors flex items-center gap-2">
                    <span className="material-symbols-outlined">volume_up</span>
                  </button>
                  <span className="font-body-sm text-body-sm opacity-80">0:15 / 0:45</span>
                </div>
                <button className="hover:text-primary-container transition-colors">
                  <span className="material-symbols-outlined">fullscreen</span>
                </button>
              </div>
            </div>
            {/* Center Play/Pause Indicator (Flashing state) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/40 rounded-full p-4 text-white opacity-0 transition-opacity">
              <span
                className="material-symbols-outlined text-4xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                play_arrow
              </span>
            </div>
          </div>
          {/* Right Side: Product Details (40%) */}
          <div className="w-full md:w-[40%] h-[50%] md:h-full bg-surface p-8 flex flex-col overflow-y-auto">
            <div className="mb-4">
              <span className="inline-block bg-tertiary text-on-tertiary-container font-label-caps text-label-caps px-4 py-1.5 rounded-full mb-3 shadow-sm border border-tertiary/20">
                NEW ARRIVAL
              </span>
            </div>
            <h2 className="font-headline-md text-headline-md text-on-surface mb-2">
              Midnight Bloom Saree
            </h2>
            <div className="font-price-display text-price-display text-primary mb-6">₹ 18,500</div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-8 flex-grow">
              A masterpiece of traditional craftsmanship meeting contemporary design. This
              georgette saree features intricate zari work and subtle sequin detailing along the
              border, inspired by heritage motifs. Perfect for evening soirées and festive
              gatherings.
            </p>
            <div className="space-y-4 mt-auto">
              {/* Size Selector (Minimalist) */}
              <div>
                <span className="font-label-caps text-label-caps text-on-surface-variant block mb-2">
                  SIZE
                </span>
                <div className="flex gap-2">
                  {SIZES.map((size) =>
                    size === SELECTED_SIZE ? (
                      <button
                        key={size}
                        className="w-10 h-10 rounded-full border-2 border-primary bg-primary/5 flex items-center justify-center font-body-sm text-body-sm text-primary font-bold"
                      >
                        {size}
                      </button>
                    ) : (
                      <button
                        key={size}
                        className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center font-body-sm text-body-sm hover:border-primary transition-colors"
                      >
                        {size}
                      </button>
                    )
                  )}
                </div>
              </div>
              <button className="w-full bg-[#ff69b4] hover:bg-[#ac2471] text-white font-label-caps text-label-caps py-4 rounded-[12px] transition-colors duration-300 uppercase tracking-widest flex items-center justify-center gap-2 mt-4 shadow-sm hover:shadow-md">
                <span>View Product</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
              <button className="w-full bg-transparent border border-tertiary/50 text-tertiary font-label-caps text-label-caps py-3 rounded-[12px] hover:bg-tertiary/5 transition-colors uppercase tracking-widest flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-sm">favorite_border</span>
                <span>Save for Later</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
