import {createRoot} from 'react-dom/client';
import App from './app/App.tsx';
import './index.css';
import { resetLocationAfterReload } from './app/router/browserRouter';

resetLocationAfterReload(window);
createRoot(document.getElementById('root')!).render(<App />);
