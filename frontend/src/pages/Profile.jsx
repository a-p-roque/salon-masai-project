import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import {
  Award,
  Heart,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  RefreshCw,
  LogOut,
  Sparkles,
  Scissors,
  ArrowRight,
  ShieldCheck,
  X,
  Sun,
  Moon,
  Camera,
  Upload,
  AlertTriangle,
  Trash2,
} from 'lucide-react';

const formatDuration = (totalMinutes) => {
  if (!totalMinutes) return '';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

const getNext14Days = () => {
  const days = [];
  const today = new Date();

  for (let i = 0; i < 14; i++) {
    const d = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + i
    );

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const isoDate = `${year}-${month}-${day}`;

    days.push({
      dateObj: d,
      dayNum: d.getDate(),
      isoDate: isoDate,
      labelName: d
        .toLocaleDateString('es-ES', { weekday: 'short' })
        .toUpperCase(),
      fullLabel: d.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
      }),
    });
  }
  return days;
};

export default function Perfil() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [citas, setCitas] = useState([]);
  const [favoriteServices, setFavoriteServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);

  // Modales
  const [speiModalOpen, setSpeiModalOpen] = useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedCitaToReschedule, setSelectedCitaToReschedule] =
    useState(null);

  // Modal Cancelar Cita
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedCitaToCancel, setSelectedCitaToCancel] = useState(null);

  // Reagendado con Disponibilidad en Tiempo Real
  const [availableDays] = useState(getNext14Days());
  const [selectedDayObj, setSelectedDayObj] = useState(availableDays[0]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal para Actualizar Avatar / Foto
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');

  // Obtener la URL del avatar desde cualquier propiedad posible para evitar fallas
  const currentAvatar = user?.avatarUrl || user?.imageUrl;

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    let isMounted = true;

    const loadUserData = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const [citasRes, serviciosRes] = await Promise.all([
          api.get('/citas/mis-citas'),
          api.get('/servicios'),
        ]);

        if (isMounted) {
          setCitas(citasRes.data);

          const savedFavIds = JSON.parse(
            localStorage.getItem(`masai_favs_${user.id}`) || '[]'
          );
          const favs = serviciosRes.data.filter((s) =>
            savedFavIds.includes(s.id)
          );
          setFavoriteServices(favs);
        }
      } catch (err) {
        console.error('Error al cargar perfil:', err);
        if (isMounted) {
          toast.error('No se pudo sincronizar tu historial de citas.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadUserData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Cargar slots disponibles para reagendar
  useEffect(() => {
    if (!rescheduleModalOpen || !selectedCitaToReschedule) return;

    let isMounted = true;
    const fetchSlots = async () => {
      setLoadingSlots(true);
      try {
        const duration = selectedCitaToReschedule.service?.durationMin || 60;
        const res = await api.get('/citas/disponibilidad', {
          params: {
            fecha: selectedDayObj.isoDate,
            duracionTotalMin: duration,
          },
        });

        if (isMounted) {
          setAvailableSlots(res.data.slots || []);
          if (res.data.slots && res.data.slots.length > 0) {
            setSelectedTime(res.data.slots[0]);
          } else {
            setSelectedTime('');
          }
        }
      } catch (err) {
        console.error('Error obteniendo disponibilidad para reagendar:', err);
        if (isMounted) setAvailableSlots([]);
      } finally {
        if (isMounted) setLoadingSlots(false);
      }
    };

    fetchSlots();

    return () => {
      isMounted = false;
    };
  }, [rescheduleModalOpen, selectedDayObj, selectedCitaToReschedule]);

  const refetchCitas = async () => {
    try {
      const res = await api.get('/citas/mis-citas');
      setCitas(res.data);
    } catch (err) {
      console.error('Error actualizando citas:', err);
    }
  };

  const handleOpenReschedule = (cita) => {
    const estaValidado =
      Boolean(cita.advancePaid) ||
      cita.status === 'CONFIRMED' ||
      Number(cita.advanceAmount) > 0;

    if (!estaValidado) {
      toast.error(
        'Para reagendar tu cita requieres tener registrado el anticipo de garantía.'
      );
      return;
    }

    if (cita.hasRescheduled) {
      toast.error('Esta cita ya utilizó su único cambio de fecha permitido.');
      return;
    }

    setSelectedCitaToReschedule(cita);
    setRescheduleModalOpen(true);
  };

  const handleConfirmReschedule = async (e) => {
    e.preventDefault();
    if (!selectedTime) {
      toast.error('Selecciona un horario disponible.');
      return;
    }

    setSaving(true);
    try {
      // Extraer horas y minutos
      const timeParts = selectedTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (!timeParts) {
        toast.error('Formato de hora no válido.');
        return;
      }

      let hours = parseInt(timeParts[1], 10);
      const minutes = parseInt(timeParts[2], 10);
      const modifier = timeParts[3] ? timeParts[3].toUpperCase() : null;

      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;

      const [year, month, day] = selectedDayObj.isoDate.split('-').map(Number);
      const newStart = new Date(year, month - 1, day, hours, minutes, 0, 0);

      await api.patch(`/citas/${selectedCitaToReschedule.id}/reagendar`, {
        newStartTime: newStart.toISOString(),
      });

      toast.success(
        '¡Cita reagendada con éxito! Tu anticipo se mantiene cubierto.',
        {
          icon: '🗓️',
        }
      );

      setRescheduleModalOpen(false);
      setSelectedCitaToReschedule(null);
      refetchCitas();
    } catch (err) {
      console.error('Error reagendando cita:', err);
      toast.error(err.response?.data?.error || 'Error al reagendar cita.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenCancel = (cita) => {
    setSelectedCitaToCancel(cita);
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedCitaToCancel) return;

    setSaving(true);
    try {
      await api.patch(`/citas/${selectedCitaToCancel.id}/cancelar`);
      toast.success('Cita cancelada correctamente.');
      setCancelModalOpen(false);
      setSelectedCitaToCancel(null);
      refetchCitas();
    } catch (err) {
      console.error('Error al cancelar cita:', err);
      toast.error(err.response?.data?.error || 'No se pudo cancelar la cita.');
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('La imagen no debe superar los 5MB.');
        return;
      }
      setSelectedFile(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleSaveAvatar = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Selecciona una imagen primero.');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('photo', selectedFile);

      const response = await api.post(`/clientes/${user.id}/avatar`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('¡Foto de perfil actualizada!');

      const rawUrl =
        response.data?.avatarUrl ||
        response.data?.imageUrl ||
        response.data?.customer?.imageUrl;

      if (rawUrl) {
        // Normalizar la URL para que no dependa de localhost hardcodeado
        const apiBase = api.defaults.baseURL
          ? api.defaults.baseURL.replace('/api', '')
          : '';
        const finalAvatarUrl = rawUrl.startsWith('http')
          ? rawUrl
          : `${apiBase}${rawUrl}`;

        const updatedUser = {
          ...user,
          avatarUrl: finalAvatarUrl,
          imageUrl: finalAvatarUrl,
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      setAvatarModalOpen(false);
      window.location.reload();
    } catch (err) {
      console.error('Error al actualizar avatar:', err);
      toast.error(
        err.response?.data?.error ||
          'No se pudo guardar la imagen. Intenta con una foto más ligera.'
      );
    } finally {
      setSaving(false);
    }
  };

  const removeFavorite = (serviceId) => {
    const updatedFavs = favoriteServices.filter((s) => s.id !== serviceId);
    setFavoriteServices(updatedFavs);
    const favIds = updatedFavs.map((s) => s.id);
    localStorage.setItem(`masai_favs_${user.id}`, JSON.stringify(favIds));
    toast.success('Quitado de tus favoritos');
  };

  if (!user) return null;

  // Validación flexible para detectar si la usuaria es Socia VIP / Cliente Frecuente
  const esClienteFrecuente =
    Boolean(user?.isFrequent) ||
    Boolean(user?.esFrecuente) ||
    user?.tipo === 'FREQUENT' ||
    user?.role === 'FREQUENT';

  const ahora = new Date();

  const citasProximas = citas.filter((c) => {
    const fechaFin = new Date(c.endTime || c.startTime);
    const esFutura = fechaFin >= ahora;
    const esActiva = c.status !== 'CANCELED' && c.status !== 'COMPLETED';
    return esFutura && esActiva;
  });

  const citasPasadas = citas.filter((c) => {
    const fechaFin = new Date(c.endTime || c.startTime);
    const yaPaso = fechaFin < ahora;
    const esInactiva = c.status === 'CANCELED' || c.status === 'COMPLETED';
    return yaPaso || esInactiva;
  });

  return (
    <div className="mx-auto min-h-screen max-w-md bg-[#FAF8F5] pb-28 shadow-xl transition-all md:max-w-4xl lg:max-w-5xl">
      {/* Header Perfil */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-stone-200/60 bg-[#FAF8F5]/90 px-4 py-3.5 backdrop-blur-md md:px-8">
        <div className="flex items-center gap-3">
          <img
            src="/logo.jpg"
            alt="Salón Masai Logo"
            className="h-9 w-9 rounded-full border border-stone-200 object-cover shadow-2xs"
          />
          <div>
            <h1 className="font-serif text-base font-bold text-stone-800 md:text-lg">
              Salón Masai
            </h1>
            <p className="text-[9px] font-bold tracking-wider text-stone-400 uppercase">
              MI PERFIL & RITUALES
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-rose-50 text-rose-600 transition-colors hover:bg-rose-100"
          title="Cerrar Sesión"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      <main className="px-4 pt-4 md:px-8">
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-12">
          {/* COLUMNA IZQUIERDA */}
          <div className="flex flex-col gap-6 md:col-span-5">
            {/* Tarjeta de Membresía */}
            <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-stone-900 via-stone-800 to-black p-5 text-white shadow-xl md:p-6">
              <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-pink-500/10 blur-2xl"></div>

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="group relative">
                    {/* Renderizado dinámico del Avatar */}
                    {currentAvatar ? (
                      <img
                        src={currentAvatar}
                        alt={user.nombre}
                        className="h-14 w-14 rounded-2xl border-2 border-amber-300/60 object-cover shadow-md"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-amber-300/60 bg-pink-950/60 font-serif text-xl font-bold text-amber-200">
                        {user.nombre?.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setPreviewImage(currentAvatar || '');
                        setAvatarModalOpen(true);
                      }}
                      className="absolute -right-1 -bottom-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-amber-400 text-stone-900 shadow-md transition-transform active:scale-90"
                      title="Cambiar Foto"
                    >
                      <Camera className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/20 px-2.5 py-0.5 text-[9px] font-bold tracking-wider text-amber-300 uppercase backdrop-blur-xs">
                      <Sparkles className="h-3 w-3" />
                      {esClienteFrecuente
                        ? 'SOCIA VIP FRECUENTE'
                        : 'MIEMBRO MASAI CLUB'}
                    </span>
                    <h2 className="mt-1 font-serif text-lg font-bold md:text-xl">
                      {user.nombre}
                    </h2>
                    <p className="text-xs font-medium text-stone-400">
                      {user.telefono}
                    </p>
                  </div>
                </div>

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-400/20 text-amber-300">
                  <Award className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                <div>
                  <span className="block text-[10px] font-bold tracking-widest text-stone-400 uppercase">
                    Puntos Masai Acumulados
                  </span>
                  <span className="font-serif text-2xl font-bold text-amber-300 md:text-3xl">
                    {user.points || 0}{' '}
                    <span className="font-sans text-xs font-normal text-stone-300">
                      pts
                    </span>
                  </span>
                </div>

                <button
                  onClick={() => navigate('/catalogo')}
                  className="flex cursor-pointer items-center gap-1 rounded-2xl border border-white/10 bg-white/10 px-3.5 py-2 text-xs font-bold text-white transition-all hover:bg-white/20 active:scale-95"
                >
                  <span>Canjear</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Santuario de Favoritos */}
            <div className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Heart className="text-salon-primary fill-salon-primary h-4 w-4" />
                  <h3 className="font-serif text-sm font-bold text-stone-800 md:text-base">
                    Tu Santuario de Favoritos
                  </h3>
                </div>
                <span className="text-xs font-semibold text-stone-400">
                  {favoriteServices.length} guardados
                </span>
              </div>

              {favoriteServices.length === 0 ? (
                <div className="mt-3 rounded-2xl bg-stone-50 p-4 text-center">
                  <p className="text-xs font-medium text-stone-400">
                    Aún no has guardado rituales. Toca el corazón en el catálogo
                    para reunirlos aquí.
                  </p>
                </div>
              ) : (
                <div className="mt-3 flex flex-col gap-2.5">
                  {favoriteServices.map((service) => (
                    <div
                      key={service.id}
                      className="flex items-center justify-between rounded-2xl border border-stone-200/60 bg-white p-3 shadow-2xs transition-all hover:border-pink-200"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            service.imageUrl ||
                            'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=200'
                          }
                          alt={service.title}
                          className="h-12 w-12 rounded-xl border border-stone-100 object-cover"
                        />
                        <div>
                          <h4 className="text-xs font-bold text-stone-800 md:text-sm">
                            {service.title}
                          </h4>
                          <p className="text-salon-primary text-xs font-bold">
                            ${Number(service.price).toFixed(2)} MXN
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            navigate('/checkout', {
                              state: { cart: [service] },
                            })
                          }
                          className="text-salon-primary hover:bg-salon-primary cursor-pointer rounded-xl border border-pink-200/60 bg-pink-50 px-3 py-1.5 text-[11px] font-bold transition-all hover:text-white"
                        >
                          Agendar
                        </button>
                        <button
                          onClick={() => removeFavorite(service.id)}
                          className="cursor-pointer p-1.5 text-stone-400 hover:text-rose-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA DERECHA */}
          <div className="flex flex-col gap-6 md:col-span-7">
            {/* Próximas Citas */}
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold tracking-wider text-stone-400 uppercase md:text-sm">
                  Tus Próximas Citas
                </h3>
                <span className="text-salon-primary rounded-full border border-pink-200/60 bg-pink-50 px-2.5 py-0.5 text-[10px] font-bold md:text-xs">
                  {citasProximas.length} activas
                </span>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="border-salon-primary h-8 w-8 animate-spin rounded-full border-3 border-t-transparent"></div>
                </div>
              ) : citasProximas.length === 0 ? (
                <div className="mt-3 rounded-3xl border border-stone-200/80 bg-white p-6 text-center shadow-2xs md:p-8">
                  <Calendar className="mx-auto h-8 w-8 text-stone-300" />
                  <p className="mt-2 text-xs font-bold text-stone-800 md:text-sm">
                    No tienes citas programadas
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-stone-400 md:text-xs">
                    Explora el catálogo y regálate un momento de belleza y
                    relajación.
                  </p>
                  <button
                    onClick={() => navigate('/catalogo')}
                    className="bg-salon-primary mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-2xl px-5 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-pink-600 active:scale-95 md:text-sm"
                  >
                    <Scissors className="h-4 w-4" />
                    <span>Agendar Servicio</span>
                  </button>
                </div>
              ) : (
                <div className="mt-3 flex flex-col gap-3">
                  {citasProximas.map((cita) => {
                    const estaValidado =
                      Boolean(cita.advancePaid) ||
                      cita.status === 'CONFIRMED' ||
                      Number(cita.advanceAmount) > 0;

                    return (
                      <div
                        key={cita.id}
                        className={`rounded-3xl border bg-white p-4 shadow-2xs transition-all md:p-5 ${
                          estaValidado
                            ? 'border-emerald-200/90 shadow-xs ring-1 shadow-emerald-100/50 ring-emerald-300/30'
                            : 'border-stone-200/80'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-bold tracking-wider text-stone-400 uppercase md:text-xs">
                              {cita.service?.category || 'Ritual Masai'}
                              {cita.service?.durationMin && (
                                <span>
                                  {' '}
                                  • {formatDuration(cita.service.durationMin)}
                                </span>
                              )}
                            </span>
                            <h4 className="font-serif text-base font-bold text-stone-800 md:text-lg">
                              {cita.service?.title}
                            </h4>
                            <div className="mt-1 flex items-center gap-2 text-xs font-medium text-stone-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-pink-500" />
                                {new Date(cita.startTime).toLocaleDateString(
                                  'es-ES',
                                  {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short',
                                  }
                                )}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-pink-500" />
                                {new Date(cita.startTime).toLocaleTimeString(
                                  [],
                                  {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  }
                                )}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold md:text-xs ${
                              estaValidado
                                ? 'border border-emerald-300/80 bg-emerald-100/80 text-emerald-900 shadow-xs ring-2 shadow-emerald-200/40 ring-emerald-400/30'
                                : 'border border-amber-200/60 bg-amber-50 text-amber-800'
                            }`}
                          >
                            {estaValidado ? 'CONFIRMADA' : 'POR CONFIRMAR'}
                          </span>
                        </div>

                        {/* Banner condicional con Glow */}
                        {!estaValidado ? (
                          <div className="mt-3 rounded-2xl border border-amber-200/80 bg-amber-50/60 p-3 text-xs">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                              <div>
                                <p className="font-bold text-amber-900">
                                  Anticipo de Garantía Pendiente
                                </p>
                                <p className="mt-0.5 text-[11px] font-medium text-amber-800">
                                  Envía tu comprobante por WhatsApp para que la
                                  administradora valide tu lugar.
                                </p>
                                <button
                                  onClick={() => setSpeiModalOpen(true)}
                                  className="text-salon-primary mt-2 cursor-pointer text-[10px] font-bold hover:underline"
                                >
                                  Ver Datos Bancarios SPEI »
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="relative mt-3 overflow-hidden rounded-2xl border border-emerald-300/80 bg-linear-to-r from-emerald-50 via-emerald-50/80 to-teal-50/60 p-3 text-xs text-emerald-900 shadow-xs ring-1 shadow-emerald-200/50 ring-emerald-300/40">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                                <div>
                                  <p className="font-bold text-emerald-950">
                                    ¡Cita Confirmada & Garantizada!
                                  </p>
                                  <p className="text-[10px] font-medium text-emerald-800">
                                    Anticipo recibido correctamente. Nos vemos
                                    en el salón.
                                  </p>
                                </div>
                              </div>
                              <span className="flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1 text-[10px] font-black text-white shadow-2xs">
                                <CheckCircle2 className="h-3 w-3" /> ¡LISTA!
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Botones de Control */}
                        <div className="mt-3.5 flex items-center justify-between border-t border-stone-100 pt-3">
                          {/* Cancelar Cita (Ambas) */}
                          <button
                            onClick={() => handleOpenCancel(cita)}
                            className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-rose-500 transition-colors hover:text-rose-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Cancelar Cita</span>
                          </button>

                          {/* Reagendar Cita (Habilitado para Socia VIP o si la cita está confirmada) */}
                          {(esClienteFrecuente || estaValidado) && (
                            <button
                              onClick={() => handleOpenReschedule(cita)}
                              disabled={cita.hasRescheduled}
                              className={`flex cursor-pointer items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                                cita.hasRescheduled
                                  ? 'cursor-not-allowed bg-stone-50 text-stone-300'
                                  : 'text-salon-primary border border-pink-200/60 bg-pink-50 shadow-2xs hover:bg-pink-100'
                              }`}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              <span>
                                {cita.hasRescheduled
                                  ? 'Reagendado (1/1)'
                                  : 'Reagendar (1 sin costo)'}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Historial */}
            {citasPasadas.length > 0 && (
              <div>
                <h3 className="text-xs font-bold tracking-wider text-stone-400 uppercase md:text-sm">
                  Historial de Visitas
                </h3>
                <div className="mt-3 flex flex-col gap-2">
                  {citasPasadas.map((cita) => (
                    <div
                      key={cita.id}
                      className="flex items-center justify-between rounded-2xl border border-stone-200/60 bg-white p-3 text-xs opacity-80 md:text-sm"
                    >
                      <div>
                        <h5 className="font-bold text-stone-800">
                          {cita.service?.title}
                        </h5>
                        <span className="text-[10px] text-stone-400 md:text-xs">
                          {new Date(cita.startTime).toLocaleDateString(
                            'es-ES',
                            {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            }
                          )}
                        </span>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold md:text-[10px] ${
                          cita.status === 'COMPLETED'
                            ? 'border border-blue-200/60 bg-blue-50 text-blue-800'
                            : 'border border-rose-200/60 bg-rose-50 text-rose-800'
                        }`}
                      >
                        {cita.status === 'COMPLETED'
                          ? 'COMPLETADA'
                          : 'CANCELADA'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MODAL CANCELAR CITA */}
      {cancelModalOpen && selectedCitaToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-stone-100 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="font-serif text-base font-bold text-stone-800">
                  ¿Cancelar tu cita?
                </h3>
              </div>
              <button
                onClick={() => setCancelModalOpen(false)}
                className="cursor-pointer text-stone-400 hover:text-stone-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3 text-xs">
              <p className="font-bold text-stone-800">
                Ritual: {selectedCitaToCancel.service?.title}
              </p>

              <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-3.5 text-rose-900">
                <p className="font-bold">⚠️ Atención:</p>
                <p className="mt-1 text-[11px] leading-snug font-medium">
                  Esta acción no es reversible. Ten en cuenta que, de acuerdo a
                  las políticas del salón, el anticipo de garantía abonado no
                  será reembolsable.
                </p>
              </div>

              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="flex-1 cursor-pointer rounded-2xl bg-stone-100 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-200"
                >
                  Conservar Cita
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={saving}
                  className="flex-1 cursor-pointer rounded-2xl bg-rose-600 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-rose-700 disabled:opacity-50"
                >
                  {saving ? 'Cancelando...' : 'Sí, Cancelar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CAMBIAR FOTO DE PERFIL */}
      {avatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-stone-100 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-serif text-base font-bold text-stone-800">
                Actualizar Foto de Perfil
              </h3>
              <button
                onClick={() => setAvatarModalOpen(false)}
                className="cursor-pointer text-stone-400 hover:text-stone-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveAvatar}
              className="mt-4 flex flex-col gap-4"
            >
              <div className="flex flex-col items-center gap-3">
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt="Vista Previa"
                    className="h-24 w-24 rounded-3xl border-2 border-amber-300 object-cover shadow-md"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-3xl border-2 border-dashed border-stone-200 bg-stone-50 text-stone-400">
                    <Camera className="h-8 w-8" />
                  </div>
                )}

                <label className="text-salon-primary flex cursor-pointer items-center gap-2 rounded-2xl border border-pink-200/60 bg-pink-50 px-4 py-2.5 text-xs font-bold shadow-2xs transition-all hover:bg-pink-100">
                  <Upload className="h-4 w-4" />
                  <span>Tomar o Elegir Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setAvatarModalOpen(false)}
                  className="flex-1 cursor-pointer rounded-2xl bg-stone-100 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !previewImage}
                  className="bg-salon-primary flex-1 cursor-pointer rounded-2xl py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-pink-600 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Foto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DATOS SPEI */}
      {speiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-stone-100 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-serif text-base font-bold text-stone-800">
                Datos de Transferencia SPEI
              </h3>
              <button
                onClick={() => setSpeiModalOpen(false)}
                className="cursor-pointer text-stone-400 hover:text-stone-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3 text-xs">
              <div className="rounded-2xl border border-pink-200/80 bg-pink-50/50 p-3.5">
                <p className="text-[10px] font-bold text-stone-400 uppercase">
                  Banco Destino:
                </p>
                <p className="text-sm font-bold text-stone-800">
                  BBVA Bancomer
                </p>

                <p className="mt-2 text-[10px] font-bold text-stone-400 uppercase">
                  Titular de la Cuenta:
                </p>
                <p className="font-bold text-stone-800">Salón Masai Spa</p>

                <p className="mt-2 text-[10px] font-bold text-stone-400 uppercase">
                  CLABE Interbancaria:
                </p>
                <div className="mt-1 flex items-center justify-between rounded-xl border border-pink-200 bg-white p-2 font-mono font-bold text-stone-800">
                  <span>0121 8001 5489 3210 99</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('012180015489321099');
                      setCopied(true);
                      toast.success('CLABE copiada');
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="bg-salon-primary flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 font-sans text-[9px] font-bold text-white shadow-2xs hover:bg-pink-600"
                  >
                    <Copy className="h-3 w-3" />
                    <span>{copied ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              <p className="text-center text-[11px] font-medium text-stone-400">
                Al realizar tu transferencia, la administradora cambiará el
                estatus de tu anticipo y se liberará tu botón de confirmación.
              </p>

              <button
                onClick={() => setSpeiModalOpen(false)}
                className="mt-2 w-full cursor-pointer rounded-2xl bg-stone-800 py-3 text-xs font-bold text-white shadow-2xs hover:bg-stone-900"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REAGENDAR CITA */}
      {rescheduleModalOpen && selectedCitaToReschedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-stone-100 bg-white p-5 shadow-xl md:p-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-serif text-base font-bold text-stone-800">
                Reagendar Cita (1 sin costo)
              </h3>
              <button
                onClick={() => setRescheduleModalOpen(false)}
                className="cursor-pointer text-stone-400 hover:text-stone-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleConfirmReschedule}
              className="mt-4 flex flex-col gap-4"
            >
              <p className="text-xs font-bold text-stone-800 md:text-sm">
                Ritual: {selectedCitaToReschedule.service?.title}
              </p>

              {/* Selector de Fecha */}
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                {availableDays.map((d) => (
                  <button
                    key={d.isoDate}
                    type="button"
                    onClick={() => setSelectedDayObj(d)}
                    className={`flex shrink-0 cursor-pointer flex-col items-center rounded-2xl px-3 py-2 text-xs font-bold transition-all ${
                      d.isSunday
                        ? 'cursor-not-allowed bg-stone-100 text-stone-300 opacity-40'
                        : selectedDayObj.isoDate === d.isoDate
                          ? 'bg-salon-primary text-white shadow-2xs'
                          : 'bg-stone-50 text-stone-700 hover:bg-pink-50'
                    }`}
                  >
                    <span className="text-[8px] uppercase opacity-80">
                      {d.labelName}
                    </span>
                    <span className="text-xs font-bold">{d.fullLabel}</span>
                  </button>
                ))}
              </div>

              {/* Slots de Horarios Disponibles */}
              <div>
                <label className="mb-1 block text-[10px] font-bold tracking-wider text-stone-400 uppercase">
                  Horarios Disponibles para {selectedDayObj.fullLabel}
                </label>

                {loadingSlots ? (
                  <div className="flex justify-center py-6">
                    <div className="border-salon-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"></div>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-3 text-center text-xs font-semibold text-amber-900">
                    No hay horarios disponibles en esta fecha.
                  </div>
                ) : (
                  <div className="grid max-h-40 grid-cols-2 gap-2 overflow-y-auto p-1 sm:grid-cols-3">
                    {availableSlots.map((time) => {
                      const isPM = time.includes('PM');
                      return (
                        <button
                          key={time}
                          type="button"
                          onClick={() => setSelectedTime(time)}
                          className={`flex cursor-pointer items-center justify-between rounded-xl border p-2.5 text-xs font-bold transition-all ${
                            selectedTime === time
                              ? 'border-salon-primary text-salon-primary bg-pink-50 shadow-2xs'
                              : 'border-stone-200/80 bg-white text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            {isPM ? (
                              <Moon className="h-3 w-3 text-indigo-400" />
                            ) : (
                              <Sun className="h-3 w-3 text-amber-500" />
                            )}
                            <span>{time}</span>
                          </div>
                          <CheckCircle2
                            className={`h-3.5 w-3.5 ${
                              selectedTime === time
                                ? 'opacity-100'
                                : 'opacity-0'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setRescheduleModalOpen(false)}
                  className="flex-1 cursor-pointer rounded-2xl bg-stone-100 py-3 text-xs font-semibold text-stone-600 hover:bg-stone-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !selectedTime}
                  className="bg-salon-primary flex-1 cursor-pointer rounded-2xl py-3 text-xs font-bold text-white shadow-2xs hover:bg-pink-600 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Confirmar Reagenda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
