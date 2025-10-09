import { BrowserRouter as Router } from 'react-router-dom';
import Login from './pages/Login';
import Index from './pages/Index';
import ListEtudiants from './pages/ListEtudiants';
import Logs from './pages/Logs';

export default function App() {
  console.log("App loaded");

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/index" element={<Index />} />
        <Route path="/etudiants" element={<ListEtudiants />} />
        <Route path="/logs" element={<Logs />} />
      </Routes>
    </BrowserRouter>
  );
}
