import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ExperiencePage from './routes/ExperiencePage';
import Home from './routes/Home';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/e/:slug" element={<ExperiencePage />} />
        <Route path="/" element={<Home />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
