import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import EditorApp from './EditorApp.tsx';
import './index.css';

createRoot(document.getElementById('editor-root')!).render(
  <StrictMode>
    <EditorApp />
  </StrictMode>,
);
