import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { formatPhoneNumber, cleanPhoneNumber } from '../utils/formatters';
import {
  Phone,
  Lock,
  User,
  ArrowRight,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function Login() {
  const [activeTab, setActiveTab] = useState('LOGIN'); // 'LOGIN' | 'REGISTER' | 'ADMIN'
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');

  // Estados Administradora
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Toggles de visibilidad
  const [showPin, setShowPin] = useState(false);
  const [showAdminPass, setShowAdminPass] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handlePhoneChange = (e) => {
    setPhone(formatPhoneNumber(e.target.value));
  };

  const handleSubmitClient = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const rawPhone = cleanPhoneNumber(phone);
    if (rawPhone.length !== 10) {
      setError('El teléfono debe tener exactamente 10 dígitos.');
      setLoading(false);
      return;
    }

    try {
      const endpoint =
        activeTab === 'LOGIN'
          ? '/auth/clienta/login'
          : '/auth/clienta/register';
      const payload =
        activeTab === 'LOGIN'
          ? { phone: rawPhone, pin }
          : { name, phone: rawPhone, pin };

      const response = await api.post(endpoint, payload);
      const { token, usuario } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(usuario));

      toast.success(
        activeTab === 'LOGIN'
          ? `¡Bienvenida de nuevo, ${usuario.nombre || 'Clienta'}!`
          : '¡Cuenta creada con éxito!'
      );

      window.location.href = '/catalogo';
    } catch (err) {
      console.error('Error de autenticación clienta:', err);
      setError(
        err.response?.data?.error || 'Ocurrió un error. Verifica tus datos.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAdmin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(adminEmail, adminPassword);
      toast.success('Panel de administración cargado');
      navigate('/admin/agenda');
    } catch (err) {
      console.error('Error de login admin:', err);
      setError(
        err.response?.data?.error || 'Credenciales administrativas inválidas'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-between bg-[#FAF8F5] px-4 py-8 shadow-xl transition-all">
      <div>
        {/* Logo Oficial */}
        <div className="text-center">
          <img
            src="/logo.jpg"
            alt="Salón Masai Logo"
            className="mx-auto h-20 w-20 rounded-full border-2 border-stone-200/80 object-cover shadow-2xs"
          />
          <span className="text-salon-primary mt-3 inline-block rounded-full border border-pink-200/60 bg-pink-100/70 px-3 py-1 text-[10px] font-bold tracking-widest uppercase">
            BELLEZA • SPA • BIENESTAR
          </span>
          <h1 className="mt-2 font-serif text-2xl font-bold text-stone-800">
            Tu Cuenta Masai
          </h1>
          <p className="mt-1 text-xs font-medium text-stone-400">
            Accede fácilmente con tu número celular y tu PIN personal.
          </p>
        </div>

        {/* Tarjeta Principal */}
        <div className="mt-6 rounded-3xl border border-stone-200/80 bg-white p-5 shadow-2xs md:p-6">
          {activeTab !== 'ADMIN' ? (
            <>
              {/* Pestañas: Ingresar vs Crear Cuenta */}
              <div className="flex rounded-2xl bg-stone-100/70 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('LOGIN');
                    setError('');
                  }}
                  className={`flex-1 cursor-pointer rounded-xl py-2 text-xs font-bold transition-all ${
                    activeTab === 'LOGIN'
                      ? 'bg-white text-stone-800 shadow-2xs'
                      : 'text-stone-400 hover:text-stone-600'
                  }`}
                >
                  Ingresar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('REGISTER');
                    setError('');
                  }}
                  className={`flex-1 cursor-pointer rounded-xl py-2 text-xs font-bold transition-all ${
                    activeTab === 'REGISTER'
                      ? 'bg-white text-stone-800 shadow-2xs'
                      : 'text-stone-400 hover:text-stone-600'
                  }`}
                >
                  Crear Cuenta
                </button>
              </div>

              {error && (
                <div className="mt-4 rounded-2xl border border-rose-200/60 bg-rose-50 p-3 text-center text-xs font-semibold text-rose-600">
                  {error}
                </div>
              )}

              <form
                className="mt-4 flex flex-col gap-3.5"
                onSubmit={handleSubmitClient}
              >
                {activeTab === 'REGISTER' && (
                  <div>
                    <label className="block text-[10px] font-bold tracking-wider text-stone-500 uppercase">
                      Nombre Completo *
                    </label>
                    <div className="relative mt-1">
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ej. Mariana Palacios"
                        className="w-full rounded-2xl border border-stone-200/80 py-2.5 pr-3 pl-9 text-xs font-medium text-stone-800 focus:border-pink-300 focus:ring-1 focus:ring-pink-200 focus:outline-none"
                      />
                      <User className="absolute top-3 left-3 h-4 w-4 text-stone-400" />
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold tracking-wider text-stone-500 uppercase">
                      Teléfono Celular *
                    </label>
                    <span className="rounded-full border border-amber-200/60 bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-800">
                      10 dígitos
                    </span>
                  </div>
                  <div className="relative mt-1">
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={handlePhoneChange}
                      placeholder="55 1234 5678"
                      className="w-full rounded-2xl border border-stone-200/80 py-2.5 pr-3 pl-9 text-xs font-medium text-stone-800 focus:border-pink-300 focus:ring-1 focus:ring-pink-200 focus:outline-none"
                    />
                    <Phone className="absolute top-3 left-3 h-4 w-4 text-stone-400" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold tracking-wider text-stone-500 uppercase">
                      PIN de Seguridad (4 - 6 dígitos) *
                    </label>
                  </div>
                  <div className="relative mt-1">
                    <input
                      type={showPin ? 'text' : 'password'}
                      required
                      maxLength={6}
                      value={pin}
                      onChange={(e) =>
                        setPin(e.target.value.replace(/\D/g, ''))
                      }
                      placeholder="••••"
                      className="w-full rounded-2xl border border-stone-200/80 py-2.5 pr-10 pl-9 text-xs font-medium text-stone-800 focus:border-pink-300 focus:ring-1 focus:ring-pink-200 focus:outline-none"
                    />
                    <Lock className="absolute top-3 left-3 h-4 w-4 text-stone-400" />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute top-3 right-3 cursor-pointer text-stone-400 hover:text-stone-700"
                    >
                      {showPin ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-salon-primary mt-2 w-full cursor-pointer rounded-2xl py-3 text-xs font-bold text-white shadow-2xs transition-all hover:bg-pink-600 active:scale-98 disabled:opacity-50"
                >
                  {loading
                    ? 'Procesando...'
                    : activeTab === 'LOGIN'
                      ? 'Entrar a mi Cuenta'
                      : 'Crear Mi Cuenta Masai'}
                </button>
              </form>
            </>
          ) : (
            /* Formulario Administradora */
            <>
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h3 className="font-serif text-sm font-bold text-stone-800">
                  Acceso Administradora
                </h3>
                <button
                  onClick={() => {
                    setActiveTab('LOGIN');
                    setError('');
                  }}
                  className="text-salon-primary cursor-pointer text-[10px] font-bold hover:underline"
                >
                  « Volver a Clientas
                </button>
              </div>

              {error && (
                <div className="mt-3 rounded-2xl border border-rose-200/60 bg-rose-50 p-3 text-center text-xs font-semibold text-rose-600">
                  {error}
                </div>
              )}

              <form
                className="mt-4 flex flex-col gap-3.5"
                onSubmit={handleSubmitAdmin}
              >
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-stone-500 uppercase">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@salon.com"
                    className="mt-1 w-full rounded-2xl border border-stone-200/80 px-3 py-2.5 text-xs font-medium text-stone-800 focus:border-pink-300 focus:ring-1 focus:ring-pink-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-stone-500 uppercase">
                    Contraseña *
                  </label>
                  <div className="relative mt-1">
                    <input
                      type={showAdminPass ? 'text' : 'password'}
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-2xl border border-stone-200/80 px-3 py-2.5 pr-10 text-xs font-medium text-stone-800 focus:border-pink-300 focus:ring-1 focus:ring-pink-200 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPass(!showAdminPass)}
                      className="absolute top-3 right-3 cursor-pointer text-stone-400 hover:text-stone-700"
                    >
                      {showAdminPass ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full cursor-pointer rounded-2xl bg-stone-800 py-3 text-xs font-bold text-white shadow-2xs transition-all hover:bg-stone-900 active:scale-98 disabled:opacity-50"
                >
                  {loading ? 'Ingresando...' : 'Ingresar al Panel Admin'}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Banner Opcional: Continuar como Invitada */}
        {activeTab !== 'ADMIN' && (
          <div className="mt-4 rounded-3xl border border-amber-200/80 bg-amber-50/50 p-4 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-200/60 bg-amber-100 text-amber-800">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-stone-800">
                  ¿Primera vez aquí? Explora sin registrarte
                </h4>
                <p className="mt-0.5 text-[10px] font-medium text-stone-400">
                  Podrás explorar nuestros servicios y agendar tu cita antes de
                  completar tu registro.
                </p>
                <button
                  onClick={() => navigate('/catalogo')}
                  className="text-salon-primary mt-2.5 flex cursor-pointer items-center gap-1 text-xs font-bold hover:underline"
                >
                  <span>Continuar como Invitada / Ver Catálogo</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 text-center">
        {activeTab !== 'ADMIN' && (
          <button
            onClick={() => {
              setActiveTab('ADMIN');
              setError('');
            }}
            className="text-salon-primary cursor-pointer rounded-full border border-pink-200/60 bg-pink-50 px-4 py-1.5 text-[11px] font-bold transition-all hover:bg-pink-100"
          >
            🛡️ ¿Eres la dueña? Iniciar como Administradora
          </button>
        )}
        <p className="mt-3 text-[10px] font-medium text-stone-400">
          Salón Masai • Tu santuario de bienestar y autocuidado
        </p>
      </div>
    </div>
  );
}
