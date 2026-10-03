import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast'; // 👈 Importamos Toaster
import { AuthProvider } from './context/AuthProvider';
import Catalog from './pages/Catalog';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Profile from './pages/Profile';
import AdminAgenda from './pages/AdminAgenda';
import AdminBusinessHours from './pages/AdminBusinessHours';
import AdminCustomers from './pages/AdminCustomers';
import AdminServices from './pages/AdminServices';
import RutaProtegida from './components/RutaProtegida';

export default function App() {
  return (
    <AuthProvider>
      {/* 👈 Configuración global de notificaciones Toaster */}
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
          style: {
            background: '#ffffff',
            color: '#2d2d2d',
            fontSize: '12px',
            fontWeight: '600',
            borderRadius: '16px',
            padding: '12px 16px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(244, 211, 221, 0.5)',
          },
        }}
      />

      <BrowserRouter>
        <div className="bg-salon-bg min-h-screen">
          <Routes>
            {/* Rutas Públicas */}
            <Route path="/catalogo" element={<Catalog />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/login" element={<Login />} />

            {/* Rutas Protegidas de Clienta / Admin */}
            <Route element={<RutaProtegida />}>
              <Route path="/perfil" element={<Profile />} />
              <Route path="/admin/agenda" element={<AdminAgenda />} />
              <Route path="/admin/servicios" element={<AdminServices />} />
              <Route path="/admin/clientes" element={<AdminCustomers />} />
              <Route path="/admin/horarios" element={<AdminBusinessHours />} />
            </Route>

            <Route path="*" element={<Navigate to="/catalogo" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}