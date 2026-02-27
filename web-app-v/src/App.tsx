import { RouterProvider } from 'react-router-dom';
import { Suspense, useEffect } from 'react';
import { router } from './router';
import { useSettingsStore } from './stores/settingsStore';

function App() {
  const fetchSettings = useSettingsStore((s) => s.fetchSettings);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <Suspense
      fallback={(
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    >
      <RouterProvider router={router} />
    </Suspense>
  );
}

export default App;
