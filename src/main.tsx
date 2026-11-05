import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ErrorBoundary } from './components/ErrorBoundary';
import { WorkspaceContainer } from './pages/Workspace/Workspace.container';
import './styles.css';

const root = document.querySelector('#root');
if (!root) {
  throw new Error('Missing #root element');
}

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <WorkspaceContainer />
    </ErrorBoundary>
  </StrictMode>
);
