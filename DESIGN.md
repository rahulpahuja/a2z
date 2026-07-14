---
name: Ethno-Modernist Heritage
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#564149'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#897179'
  outline-variant: '#dcbfc9'
  surface-tint: '#ac2471'
  primary: '#ac2471'
  on-primary: '#ffffff'
  primary-container: '#ff69b4'
  on-primary-container: '#6e0044'
  inverse-primary: '#ffb0d0'
  secondary: '#486730'
  on-secondary: '#ffffff'
  secondary-container: '#c9eea9'
  on-secondary-container: '#4e6d36'
  tertiary: '#7a5642'
  on-tertiary: '#ffffff'
  tertiary-container: '#c1967f'
  on-tertiary-container: '#4d2f1e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffd8e6'
  primary-fixed-dim: '#ffb0d0'
  on-primary-fixed: '#3d0024'
  on-primary-fixed-variant: '#8c0058'
  secondary-fixed: '#c9eea9'
  secondary-fixed-dim: '#aed18f'
  on-secondary-fixed: '#0b2000'
  on-secondary-fixed-variant: '#314e1b'
  tertiary-fixed: '#ffdbca'
  tertiary-fixed-dim: '#ecbda4'
  on-tertiary-fixed: '#2e1506'
  on-tertiary-fixed-variant: '#603f2d'
  background: '#fcf9f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-md-mobile:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  title-sm:
    fontFamily: Montserrat
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.5'
    letterSpacing: 0.05em
  body-lg:
    fontFamily: Montserrat
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Montserrat
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: Montserrat
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.1em
  price-display:
    fontFamily: Montserrat
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
---

## Brand & Style
The design system bridges traditional Indian craftsmanship with high-end contemporary fashion. It targets a sophisticated audience that values cultural heritage presented through a premium, editorial lens. The visual language is a blend of **Minimalism** and **Modern Corporate**, utilizing generous whitespace to allow vibrant product photography to breathe. 

The emotional response should be one of "Vibrant Elegance"—capturing the energy of Indian textiles while maintaining the disciplined structure of a luxury global boutique. Expect clean layouts, deliberate use of accent colors to denote artisanal quality, and a focus on high-fidelity imagery.

## Colors
The palette is rooted in the "Hot Pink" primary, a nod to the iconic 'Pink City' and traditional Rani pink, used strategically for calls to action and brand highlights. 

- **Primary (#FF69B4):** Used for primary buttons, active states, and price highlights.
- **Secondary Sage (#87A96B):** Applied to organic elements, sustainability labels, and soft background washes for product categories.
- **Tertiary Dusty Rose (#DCAE96):** Used for subtle UI accents, dividers, and secondary button backgrounds to maintain a sophisticated warmth.
- **Neutral Stack:** A deep charcoal (#1A1A1A) for maximum legibility in typography, set against an off-white silk background (#F9F9F9) to reduce harsh contrast.

## Typography
The typography system uses a classic serif/sans-serif pairing to establish a hierarchy of "Editorial vs. Functional." 

**Playfair Display** is reserved for high-level headings and storytelling moments. It should be typeset with tight tracking in display sizes to emphasize its elegant high-contrast strokes. **Montserrat** handles all functional UI, body copy, and navigation. Use `label-caps` for category headers and overlines to add a structured, boutique feel. All currency displays (₹) should use Montserrat Medium or SemiBold to ensure the symbol remains legible and modern.

## Layout & Spacing
The design system utilizes a **12-column fluid grid** for desktop and a **4-column grid** for mobile. 

- **Vertical Rhythm:** Based on an 8px square grid. All component heights and margins must be multiples of 8.
- **Negative Space:** Editorial sections (lookbooks) should use double the standard margin (128px) to create a premium, "gallery" feel.
- **Grid Behavior:** Images in product listings should adhere to a 3:4 aspect ratio to best showcase traditional silhouettes (Saris, Anarkalis).

## Elevation & Depth
To maintain a high-end fashion aesthetic, this design system avoids heavy shadows. Depth is created through **Tonal Layers** and minimal usage of **Ambient Shadows**.

- **Level 0 (Base):** Off-white background.
- **Level 1 (Cards):** 1px border in Dusty Rose (#DCAE96) at 30% opacity, with no shadow.
- **Level 2 (Dropdowns/Modals):** A soft, diffused shadow (0px 10px 30px) with a 5% opacity tint of the Primary color to give a subtle "glow" rather than a grey smudge.
- **Imagery:** Product images should appear flat on the surface or utilize a natural "studio-lit" drop shadow within the photography itself, rather than through CSS.

## Shapes
The shape language is defined by "Soft Architectural" lines. While the grid is rigid, the elements within it are softened to reflect the flow of fabric. 

- **Standard Components:** Buttons and input fields use a **12px** radius.
- **Containers:** Product cards and image containers use a **16px** (rounded-lg) radius to create a contemporary, friendly frame for the apparel.
- **Iconography:** Use linear, medium-stroke icons with rounded ends to match the `roundedness: 2` setting.

## Components
- **Buttons:** Primary buttons are solid Hot Pink with white text, utilizing 12px rounding. Secondary buttons use a Dusty Rose outline or a Sage Green ghost style. Label text must be Montserrat Bold in Uppercase.
- **Product Cards:** Must feature a 16px corner radius on the image. The price is displayed in Montserrat SemiBold (₹) followed by the amount. Use a Sage Green "Handcrafted" chip where applicable.
- **Chips/Tags:** Used for sizes (S, M, L, XL) and "New Arrival" labels. These use a 32px pill-shape and a Tertiary (Dusty Rose) background with dark text.
- **Input Fields:** Minimalist design with a bottom border or a very light 1px border in Dusty Rose. Focus states transition the border to Hot Pink.
- **Lists/Navigation:** Desktop navigation uses Playfair Display for top-level categories to signal luxury, while sub-menus use Montserrat for clarity. 
- **Icons:** Custom stroke icons that represent Indian heritage (e.g., a stylized lotus for favorites or a traditional fabric roll for 'Material' details) are encouraged.