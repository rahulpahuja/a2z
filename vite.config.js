import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Only runs on `vite build` (never `vite dev`, so HMR/debugging stay
    // fast and readable). Only touches our own src/** — vendor code in
    // node_modules (ffmpeg, onnxruntime wasm glue, firebase, etc.) is left
    // alone since those libraries can rely on exact code shape and heavy
    // obfuscation transforms have broken things like that before.
    // debugProtection/selfDefending are deliberately OFF: both are known to
    // freeze or infinite-loop real user sessions (e.g. anyone with devtools
    // open), which fails the "must not break the app" bar.
    obfuscatorPlugin({
      apply: 'build',
      exclude: [/node_modules/],
      options: {
        compact: true,
        // Without this, string-array obfuscation mangles the specifier
        // inside dynamic import('heic2any')-style calls so Rollup can no
        // longer statically resolve/split it — breaks that feature at
        // runtime in production. Keep import specifiers untouched.
        ignoreImports: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.3,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.1,
        identifierNamesGenerator: 'hexadecimal',
        renameGlobals: false,
        selfDefending: false,
        debugProtection: false,
        disableConsoleOutput: false,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 0.75,
        rotateStringArray: true,
        transformObjectKeys: false,
        unicodeEscapeSequence: false,
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['@imgly/background-removal'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: false,
  },
})
