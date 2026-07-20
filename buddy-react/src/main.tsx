import { createRoot } from 'react-dom/client';
import './home.css';
import { PhoneShell } from './PhoneShell';

// No StrictMode: the module renderers are imperative (they mount DOM and attach
// listeners into a ref), so the dev double-invoke would create duplicates.
createRoot(document.getElementById('root')!).render(<PhoneShell />);
