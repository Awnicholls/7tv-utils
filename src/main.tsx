import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { CopierContainer } from './pages/Copier/Copier.container';
import './styles.css';

const root = document.querySelector('#root');
if (!root) {
  throw new Error('Missing #root element');
}

createRoot(root).render(
  <StrictMode>
    <CopierContainer />
  </StrictMode>
);
