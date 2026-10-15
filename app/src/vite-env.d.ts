/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_SITE_URL?: string;
  readonly VITE_ACCOUNT_URL?: string;
  readonly VITE_SUPPORT_URL?: string;
  /** "staging" : exe fabriqué pour le serveur de test (workflow app-windows), affiché dans la barre de titre */
  readonly VITE_RAGO_SERVER?: string;
}
declare const __APP_VERSION__: string;
