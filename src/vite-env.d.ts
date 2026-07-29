/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_YOUVERSION_API_KEY?: string;
  readonly VITE_YOUVERSION_BASE_URL?: string;
  readonly VITE_GLOO_API_KEY?: string;
  readonly VITE_GLOO_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
