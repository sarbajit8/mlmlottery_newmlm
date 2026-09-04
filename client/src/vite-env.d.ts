/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL the browser uses for API calls. Defaults to "/api" (Vite dev proxy). */
  readonly VITE_API_BASE_URL?: string;
  /** Backend origin the Vite dev server proxies "/api" to. */
  readonly VITE_API_PROXY_TARGET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
