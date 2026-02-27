export async function initMocks() {
  const useMock = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true';

  if (useMock) {
    const { worker } = await import('./browser');
    return worker.start({
      onUnhandledRequest: 'bypass',
    });
  }
  return Promise.resolve();
}
