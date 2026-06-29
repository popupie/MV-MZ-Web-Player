export async function registerPlayerServiceWorker(): Promise<ServiceWorkerRegistration | undefined> {
  if (!("serviceWorker" in navigator)) return undefined;

  const registration = await navigator.serviceWorker.register("/player-sw.js", { scope: "/" });
  if (!navigator.serviceWorker.controller) {
    await navigator.serviceWorker.ready;
  }
  return registration;
}
