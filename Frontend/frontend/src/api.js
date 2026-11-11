/* VGT GLASS 2100 — API FACADE
   Consumers keep importing `./api` / `../api`; this file only re-exports the
   historical public surface (140 named exports, no default) from src/api/**.
   Shared internals of ./api/client.js are intentionally not re-exported. */

export { setAuthToken, getAuthToken, isDesktopRuntime, isTrustedDesktopLocation } from './api/client';
export * from './api/auth';
export * from './api/devices';
export * from './api/identity';
export * from './api/messaging';
export * from './api/mailbox';
export * from './api/search';
export * from './api/governance';
export * from './api/rooms';
export * from './api/federation';
export * from './api/channels';
export * from './api/gaiadrop';
export * from './api/security';
export * from './api/drive';
export * from './api/gsn';
