import React, { useEffect, useState } from 'react';
import CasesList from './pages/CasesList';
import CaseDetail from './pages/CaseDetail';
import './index.css';

function useRoute() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const handler = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);
  return { path };
}

export default function App() {
  const { path } = useRoute();
  const match = path.match(/^\/case\/(.+)$/);

  const openCase = (caseId: string) => {
    window.history.pushState(null, '', `/case/${encodeURIComponent(caseId)}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const goBack = () => {
    window.history.pushState(null, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  if (match) {
    return <CaseDetail caseId={decodeURIComponent(match[1])} onBack={goBack} />;
  }

  return <CasesList onOpen={openCase} />;
}
