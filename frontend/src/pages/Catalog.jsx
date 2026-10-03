import { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  Search,
  ShoppingBag,
  User,
  Clock,
  Sparkles,
  Check,
  Plus,
  Calendar,
  ArrowRight,
  ShieldCheck,
  Heart,
  Tag,
  Bell,
  BellCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePushNotifications } from '../hooks/usePushNotifications';

const formatDuration = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

export default function Catalog() {
  const { user } = useAuth();

  // Módulo de Notificaciones Push disponible directamente en el Catálogo
  const { isSubscribed, requestAndSubscribe } = usePushNotifications(user);

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [cart, setCart] = useState([]);

  const [favorites, setFavorites] = useState(() => {
    if (!user?.id) return [];
    const saved = localStorage.getItem(`masai_favs_${user.id}`);
    return saved ? JSON.parse(saved) : [];
  });

  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const fetchServices = async () => {
      setLoading(true);
      try {
        const customerId = user?.id || '';
        const response = await api.get('/servicios/personalizado', {
          params: { customerId },
        });

        if (isMounted) {
          setServices(response.data);
        }
      } catch (err) {
        console.error('Error cargando catálogo:', err);
        if (isMounted) {
          setError('No se pudo conectar con el catálogo de servicios.');
          toast.error('Error al cargar el catálogo.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchServices();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const toggleFavorite = (e, service) => {
    e.stopPropagation();

    if (!user) {
      toast(
        (t) => (
          <div className="flex flex-col gap-1 text-xs">
            <span className="text-salon-dark font-bold">
              ✨ ¡Guarda tus servicios favoritos!
            </span>
            <span className="text-salon-muted">
              Inicia sesión o crea tu cuenta para guardar tus rituales
              preferidos.
            </span>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                navigate('/login');
              }}
              className="bg-salon-primary mt-1 rounded-xl px-3 py-1 font-bold text-white shadow-xs hover:opacity-90"
            >
              Iniciar Sesión / Crear Cuenta
            </button>
          </div>
        ),
        { duration: 4000, icon: '💖' }
      );
      return;
    }

    let updatedFavs;
    if (favorites.includes(service.id)) {
      updatedFavs = favorites.filter((id) => id !== service.id);
      toast.success('Quitado de tus favoritos', { icon: '🤍' });
    } else {
      updatedFavs = [...favorites, service.id];
      toast.success('Guardado en tus favoritos', { icon: '💖' });
    }

    setFavorites(updatedFavs);
    localStorage.setItem(`masai_favs_${user.id}`, JSON.stringify(updatedFavs));
  };

  const toggleServiceInCart = (service) => {
    if (cart.some((item) => item.id === service.id)) {
      setCart(cart.filter((item) => item.id !== service.id));
      toast.success('Servicio removido del carrito');
    } else {
      setCart([...cart, service]);
      toast.success('Servicio agregado a tu cita');
    }
  };

  const isServiceInCart = (serviceId) =>
    cart.some((item) => item.id === serviceId);

  const totalAmount = cart.reduce((acc, s) => acc + Number(s.price), 0);
  const totalDuration = cart.reduce((acc, s) => acc + s.durationMin, 0);

  const totalAdvance = cart.reduce((acc, s) => {
    const percent = s.advancePaymentPercent ?? 0.2;
    return acc + Number(s.price) * percent;
  }, 0);

  const categories = ['Todos', ...new Set(services.map((s) => s.category))];

  const filteredServices = services.filter((s) => {
    const matchesCategory =
      selectedCategory === 'Todos' || s.category === selectedCategory;
    const matchesSearch =
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.description &&
        s.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const promoService = services.find((s) => s.isPromotion) || services[0];

  if (loading) {
    return (
      <div className="bg-salon-bg flex min-h-screen items-center justify-center">
        <div className="border-salon-primary h-10 w-10 animate-spin rounded-full border-4 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="bg-salon-bg mx-auto min-h-screen max-w-md pb-36 shadow-xl transition-all md:max-w-3xl lg:max-w-5xl">
      {/* 1. Header Navigation */}
      <header className="border-salon-border/30 bg-salon-bg/90 sticky top-0 z-20 flex items-center justify-between border-b px-4 py-3 backdrop-blur-md md:px-8">
        <div className="flex items-center gap-2">
          <img
            src="/logo.jpg"
            alt="Salón Masai Logo"
            className="h-9 w-9 rounded-full border border-amber-200/80 object-cover shadow-xs"
          />
          <div>
            <h1 className="text-salon-dark font-serif text-lg font-bold tracking-wide">
              Salón Masai
            </h1>
            <p className="text-salon-muted text-[9px] font-semibold tracking-widest uppercase">
              SERVICIOS & SPA
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón de Alertas Push en el Header */}
          <button
            onClick={requestAndSubscribe}
            className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-all active:scale-95 ${
              isSubscribed
                ? 'border border-emerald-300 bg-emerald-50 text-emerald-800 shadow-xs'
                : 'border border-pink-200 bg-pink-50 text-pink-700 hover:bg-pink-100'
            }`}
            title={
              isSubscribed
                ? 'Notificaciones Activas'
                : 'Activar Alertas de Citas'
            }
          >
            {isSubscribed ? (
              <>
                <BellCheck className="h-4 w-4 text-emerald-600" />
                <span className="hidden sm:inline">Alertas ON</span>
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 animate-bounce text-pink-600" />
                <span>Alertas</span>
              </>
            )}
          </button>

          <button
            onClick={() =>
              cart.length > 0 && navigate('/checkout', { state: { cart } })
            }
            className="bg-salon-surface-low text-salon-primary relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition-transform active:scale-95"
          >
            <ShoppingBag className="h-5 w-5" />
            {cart.length > 0 && (
              <span className="bg-salon-primary absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm">
                {cart.length}
              </span>
            )}
          </button>

          <button
            onClick={() => navigate(user ? '/perfil' : '/login')}
            className="flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-amber-200/80 shadow-xs transition-transform active:scale-95"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.nombre}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="bg-salon-primary flex h-full w-full items-center justify-center text-xs font-bold text-white">
                {user ? (
                  user.nombre.slice(0, 2).toUpperCase()
                ) : (
                  <User className="h-5 w-5" />
                )}
              </div>
            )}
          </button>
        </div>
      </header>

      {/* 2. Hero Card Dinámico */}
      {promoService && (
        <div className="relative mx-4 mt-4 overflow-hidden rounded-3xl bg-gray-900 text-white shadow-xl md:mx-8">
          <img
            src={
              promoService.imageUrl ||
              'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=1200'
            }
            alt={promoService.title}
            className="h-56 w-full object-cover opacity-50 transition-transform duration-700 hover:scale-105 md:h-72"
          />
          <div className="absolute inset-0 flex flex-col justify-between bg-linear-to-t from-black/90 via-black/40 to-transparent p-6 md:p-8">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 rounded-full bg-amber-400/90 px-3 py-1 text-[10px] font-extrabold tracking-wider text-gray-900 uppercase backdrop-blur-md md:text-xs">
                <Tag className="h-3.5 w-3.5" />
                RITUAL EN PROMOCIÓN
              </span>

              <span className="flex items-center gap-1 rounded-full border border-amber-300/30 bg-black/40 px-3 py-1 text-[10px] font-bold text-amber-200 backdrop-blur-md md:text-xs">
                <ShieldCheck className="h-3.5 w-3.5" />
                Garantía Masai
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold tracking-widest text-pink-200 uppercase md:text-xs">
                {promoService.category} •{' '}
                {formatDuration(promoService.durationMin)}
              </span>
              <h2 className="font-serif text-xl leading-snug font-bold text-white md:text-3xl">
                {promoService.title}
              </h2>
              {promoService.description && (
                <p className="mt-1 line-clamp-2 text-xs text-gray-200 md:text-sm">
                  {promoService.description}
                </p>
              )}

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-semibold text-amber-300 md:text-sm">
                    Precio Especial:
                  </span>
                  <span className="font-serif text-xl font-extrabold text-white md:text-2xl">
                    ${Number(promoService.price).toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-300">MXN</span>
                </div>

                <button
                  onClick={() => toggleServiceInCart(promoService)}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-2xl px-5 py-2.5 text-xs font-bold shadow-md transition-all active:scale-95 md:text-sm ${
                    isServiceInCart(promoService.id)
                      ? 'bg-emerald-500 text-white'
                      : 'bg-salon-primary hover:bg-salon-primary-container text-white'
                  }`}
                >
                  {isServiceInCart(promoService.id) ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Agregado</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>Añadir ritual</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Buscador */}
      <div className="relative mx-4 mt-6 md:mx-8">
        <Search className="text-salon-muted absolute top-3.5 left-4 h-4 w-4" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar balayage, keratina, uñas..."
          className="bg-salon-card focus:border-salon-primary focus:ring-salon-primary border-salon-border/50 text-salon-dark placeholder-salon-muted w-full rounded-2xl border py-3 pr-4 pl-11 text-xs font-medium shadow-xs transition-all focus:ring-1 focus:outline-none md:text-sm"
        />
      </div>

      {/* 4. Filtro de Categorías */}
      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto px-4 pb-2 md:px-8">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`cursor-pointer rounded-full px-4 py-2 text-xs font-medium whitespace-nowrap transition-all md:text-sm ${
              selectedCategory === category
                ? 'bg-salon-primary font-bold text-white shadow-md'
                : 'bg-salon-card text-salon-muted hover:bg-salon-surface-low border-salon-border/40 border'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* 5. Lista de Servicios */}
      <div className="mx-4 mt-6 md:mx-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-salon-primary h-4 w-4" />
            <h2 className="text-salon-dark font-serif text-base font-bold md:text-lg">
              Nuestros Rituales
            </h2>
          </div>
          <span className="text-salon-muted text-xs font-semibold md:text-sm">
            {filteredServices.length} disponibles
          </span>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl bg-red-50 p-4 text-center text-xs text-red-600">
            {error}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredServices.map((service) => {
              const inCart = isServiceInCart(service.id);
              const isFav = favorites.includes(service.id);

              return (
                <div
                  key={service.id}
                  onClick={() => toggleServiceInCart(service)}
                  className={`group relative cursor-pointer overflow-hidden rounded-3xl border shadow-md transition-all duration-300 hover:shadow-xl active:scale-98 ${
                    inCart
                      ? 'border-emerald-500 ring-2 ring-emerald-400/50'
                      : 'border-salon-border/30 hover:border-pink-300'
                  }`}
                >
                  <img
                    src={
                      service.imageUrl ||
                      'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=500'
                    }
                    alt={service.title}
                    className="h-48 w-full object-cover transition-transform duration-700 group-hover:scale-105 md:h-52"
                  />

                  <div className="absolute inset-0 flex flex-col justify-between bg-linear-to-t from-black/90 via-black/50 to-black/20 p-4 text-white">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full border border-white/10 bg-white/20 px-3 py-1 text-[10px] font-extrabold tracking-widest text-pink-100 uppercase backdrop-blur-md">
                        {service.category}
                      </span>

                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-bold text-gray-200 backdrop-blur-md">
                          <Clock className="h-3 w-3 text-pink-300" />
                          {formatDuration(service.durationMin)}
                        </span>

                        <button
                          onClick={(e) => toggleFavorite(e, service)}
                          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/30 text-white backdrop-blur-md transition-transform hover:bg-white hover:text-pink-600 active:scale-90"
                          title={
                            isFav ? 'Quitar de Favoritos' : 'Guardar Favorito'
                          }
                        >
                          <Heart
                            className={`h-4 w-4 ${
                              isFav ? 'fill-pink-500 text-pink-500' : ''
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-serif text-base leading-tight font-bold text-white drop-shadow-xs md:text-lg">
                        {service.title}
                      </h3>
                      {service.description && (
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed font-normal text-gray-200 opacity-90">
                          {service.description}
                        </p>
                      )}

                      <div className="mt-3 flex items-center justify-between border-t border-white/20 pt-2.5">
                        <div>
                          <span className="block text-[9px] font-bold tracking-wider text-pink-200 uppercase">
                            Inversión
                          </span>
                          <span className="font-serif text-base font-extrabold text-white">
                            ${Number(service.price).toFixed(2)}{' '}
                            <span className="text-[10px] font-normal text-gray-300">
                              MXN
                            </span>
                          </span>
                        </div>

                        <div
                          className={`flex items-center gap-1.5 rounded-2xl px-4 py-2 text-xs font-extrabold shadow-md backdrop-blur-md transition-all ${
                            inCart
                              ? 'bg-emerald-500 text-white'
                              : 'text-salon-dark bg-white/90 hover:bg-white'
                          }`}
                        >
                          {inCart ? (
                            <>
                              <Check className="h-4 w-4 text-white" />
                              <span>En tu Cita</span>
                            </>
                          ) : (
                            <>
                              <Plus className="text-salon-primary h-4 w-4" />
                              <span>Añadir</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Infografía */}
      <div className="mx-4 mt-10 rounded-3xl border border-pink-200/60 bg-pink-100/50 p-6 md:mx-8">
        <h3 className="text-salon-dark font-serif text-base font-bold">
          ❓ ¿Cómo funciona tu reserva?
        </h3>
        <p className="text-salon-muted mt-1 text-xs md:text-sm">
          En Salón Masai tu tiempo y paz mental son sagrados. Reservar toma
          menos de un minuto.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="flex gap-3 rounded-2xl bg-white p-3.5 shadow-xs">
            <span className="bg-salon-surface-low text-salon-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold">
              1
            </span>
            <div>
              <p className="text-salon-dark text-xs font-bold md:text-sm">
                Elige tratamiento y horario
              </p>
              <p className="text-salon-muted text-[11px] md:text-xs">
                Selecciona el día que mejor se acomode a tu agenda en nuestro
                calendario en tiempo real.
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-2xl bg-white p-3.5 shadow-xs">
            <span className="bg-salon-surface-low text-salon-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold">
              2
            </span>
            <div>
              <p className="text-salon-dark text-xs font-bold md:text-sm">
                Asegura con tu anticipo
              </p>
              <p className="text-salon-muted text-[11px] md:text-xs">
                Tu anticipo se descuenta del total al finalizar. Incluye 1
                reagenda sin costo con aviso de 24h.
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-2xl bg-white p-3.5 shadow-xs">
            <span className="bg-salon-surface-low text-salon-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold">
              3
            </span>
            <div>
              <p className="text-salon-dark text-xs font-bold md:text-sm">
                Confirmación por WhatsApp
              </p>
              <p className="text-salon-muted text-[11px] md:text-xs">
                Recibirás tu ficha de cita y un recordatorio automático con
                ubicación exacta un día antes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 7. Floating Sticky Bottom Bar */}
      {cart.length > 0 && (
        <div className="fixed right-0 bottom-0 left-0 z-30 p-4">
          <div className="mx-auto flex max-w-md items-center justify-between rounded-3xl border border-pink-200 bg-white/95 p-3.5 shadow-2xl backdrop-blur-md md:max-w-2xl lg:max-w-4xl">
            <div className="flex items-center gap-3">
              <div className="bg-salon-primary relative flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-xs">
                <Calendar className="h-6 w-6" />
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-gray-900 shadow-xs">
                  {cart.length}
                </span>
              </div>
              <div>
                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                  Anticipo ${totalAdvance.toFixed(2)} MXN
                </span>
                <p className="text-salon-muted mt-0.5 text-xs font-medium">
                  {formatDuration(totalDuration)} • Total: $
                  {totalAmount.toFixed(2)} MXN
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate('/checkout', { state: { cart } })}
              className="bg-salon-primary hover:bg-salon-primary-container flex cursor-pointer items-center gap-2 rounded-2xl px-5 py-3 text-xs font-bold text-white shadow-md transition-all active:scale-95 md:text-sm"
            >
              <span>Agendar Cita Ahora</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
