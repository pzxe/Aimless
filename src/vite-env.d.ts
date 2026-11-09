/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Where the browser version sends analytics. Set ONLY for the web build (npm run build:web); it is never set for the
   * desktop build, so the desktop app does not even contain the address. Empty means telemetry is off.
   */
  readonly VITE_TELEMETRY_URL?: string
}

/** Injected by Vite from package.json. */
declare const __APP_VERSION__: string
