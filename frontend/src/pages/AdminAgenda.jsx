import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import { usePushNotifications } from '../hooks/usePushNotifications';
import toast from 'react-hot-toast';
import {
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Plus,
  Utensils,
  DollarSign,
  ShieldCheck,
  Users,
  Scissors,
  X,
  Save,
  Check,
  Ban,
  CheckCircle2,
  DollarSign as DollarIcon,
  CheckCheck,
  Star,
  Bell,
  BellCheck,
} from 'lucide-react';
import { formatPhoneNumber, cleanPhoneNumber } from '../utils/formatters';

export default function AdminAgenda() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Módulo de Notificaciones Push para la Administradora
  const { isSubscribed, requestAndSubscribe } = usePushNotifications(user);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [timeBlocks, setTimeBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Lista de servicios y clientes para el modal de nueva cita
  const [servicesList, setServicesList] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);

  // Modales
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedAptToCancel, setSelectedAptToCancel] = useState(null);
  const [retainAdvance, setRetainAdvance] = useState(true);

  // Formulario Bloqueo
  const [blockStartHour, setBlockStartHour] = useState('14:00');
  const [blockEndHour, setBlockEndHour] = useState('15:00');
  const [blockReason, setBlockReason] = useState('Hora de Comida');

  // Formulario Cita Manual
  const [manualCustomerType, setManualCustomerType] = useState('EXISTING');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [manualHour, setManualHour] = useState('10:00');
  const [manualNotes, setManualNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleServiceSelection = (serviceId) => {
    if (selectedServiceIds.includes(serviceId)) {
      setSelectedServiceIds(
        selectedServiceIds.filter((id) => id !== serviceId)
      );
    } else {
      setSelectedServiceIds([...selectedServiceIds, serviceId]);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadAgendaData = async () => {
      setLoading(true);
      setError(null);
      try {
        const inicio = new Date(selectedDate);
        inicio.setHours(0, 0, 0, 0);

        const fin = new Date(selectedDate);
        fin.setHours(23, 59, 59, 999);

        const [citasRes, bloqueosRes, serviciosRes, clientesRes] =
          await Promise.all([
            api.get('/citas', {
              params: { inicio: inicio.toISOString(), fin: fin.toISOString() },
            }),
            api.get('/bloqueos', {
              params: { inicio: inicio.toISOString(), fin: fin.toISOString() },
            }),
            api.get('/servicios'),
            api.get('/clientes'),
          ]);

        if (isMounted) {
          setAppointments(citasRes.data);
          setTimeBlocks(bloqueosRes.data);
          setServicesList(serviciosRes.data);
          setCustomersList(clientesRes.data);
          if (serviciosRes.data.length > 0) {
            setSelectedServiceIds([serviciosRes.data[0].id]);
          }
          if (clientesRes.data.length > 0) {
            setSelectedCustomerId(clientesRes.data[0].id);
          }
        }
      } catch (err) {
        console.error('Error cargando agenda:', err);
        if (isMounted) {
          setError('No se pudieron obtener los datos del día.');
          toast.error('Error cargando la agenda.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadAgendaData();

    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  const refetchAgenda = async () => {
    try {
      const inicio = new Date(selectedDate);
      inicio.setHours(0, 0, 0, 0);

      const fin = new Date(selectedDate);
      fin.setHours(23, 59, 59, 999);

      const [citasRes, bloqueosRes] = await Promise.all([
        api.get('/citas', {
          params: { inicio: inicio.toISOString(), fin: fin.toISOString() },
        }),
        api.get('/bloqueos', {
          params: { inicio: inicio.toISOString(), fin: fin.toISOString() },
        }),
      ]);
      setAppointments(citasRes.data);
      setTimeBlocks(bloqueosRes.data);
    } catch (err) {
      console.error('Error al actualizar agenda:', err);
    }
  };

  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const handleToggleAdvanceAndConfirm = async (cita) => {
    const yaConfirmada = cita.status === 'CONFIRMED';
    const nuevoEstadoAnticipo = !yaConfirmada;

    try {
      await api.patch(`/citas/${cita.id}/anticipo`, {
        advancePaid: nuevoEstadoAnticipo,
      });

      if (nuevoEstadoAnticipo) {
        toast.success('¡Anticipo Validado y Cita Confirmada!', { icon: '✨' });

        const telefono = cita.customer?.phone?.replace(/\D/g, '');
        if (telefono) {
          const hora = new Date(cita.startTime).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
          const fecha = new Date(cita.startTime).toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          });

          const mensaje = `✨ ¡Hola ${cita.customer.name}! Hemos recibido tu anticipo y tu cita en *Salón Masai* ha sido *CONFIRMADA*.\n\n📅 *Fecha:* ${fecha}\n⏰ *Hora:* ${hora}\n💆‍♀ *Servicio:* ${cita.service?.title}\n📍 *Ubicación:* Google Maps (https://maps.google.com)\n\n¡Te esperamos para consentirte!`;
          const url = `https://wa.me/52${telefono}?text=${encodeURIComponent(mensaje)}`;
          window.open(url, '_blank');
        }
      } else {
        toast.success('Cita devuelta a estado pendiente');
      }

      refetchAgenda();
    } catch (err) {
      console.error('Error actualizando anticipo:', err);
      toast.error('No se pudo actualizar el anticipo de la cita.');
    }
  };

  const handleChangeAptStatus = async (citaId, newStatus) => {
    try {
      await api.patch(`/citas/${citaId}/estado`, { status: newStatus });
      toast.success(`Cita marcada como ${newStatus}`);
      refetchAgenda();
    } catch (err) {
      console.error('Error cambiando estado de cita:', err);
      toast.error('No se pudo cambiar el estado.');
    }
  };

  const handleOpenCancelModal = (cita) => {
    setSelectedAptToCancel(cita);
    setRetainAdvance(true);
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedAptToCancel) return;
    setSaving(true);
    try {
      await api.patch(`/citas/${selectedAptToCancel.id}/estado`, {
        status: 'CANCELED',
        advanceRetained: retainAdvance,
      });

      toast.success(
        retainAdvance
          ? 'Cita cancelada. Anticipo retenido.'
          : 'Cita cancelada. Sin retención de anticipo.'
      );

      setCancelModalOpen(false);
      setSelectedAptToCancel(null);
      refetchAgenda();
    } catch (err) {
      console.error('Error al cancelar cita:', err);
      toast.error('Error al procesar la cancelación.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFrequent = async (customer) => {
    try {
      const newStatus = !customer.isFrequent;
      await api.patch(`/clientes/${customer.id}/perfil`, {
        isFrequent: newStatus,
      });
      toast.success(
        newStatus ? 'Marcada como Frecuente ⭐' : 'Estatus actualizado'
      );
      refetchAgenda();
    } catch (err) {
      console.error('Error al actualizar status de cliente:', err);
    }
  };

  const handleCreateTimeBlock = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const [startH, startM] = blockStartHour.split(':').map(Number);
      const [endH, endM] = blockEndHour.split(':').map(Number);

      const start = new Date(selectedDate);
      start.setHours(startH, startM, 0, 0);

      const end = new Date(selectedDate);
      end.setHours(endH, endM, 0, 0);

      await api.post('/bloqueos', {
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        reason: blockReason,
      });

      toast.success('Horario bloqueado con éxito');
      setBlockModalOpen(false);
      refetchAgenda();
    } catch (err) {
      console.error('Error creando bloqueo:', err);
      toast.error('Error al registrar el bloqueo.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateManualAppointment = async (e) => {
    e.preventDefault();
    if (selectedServiceIds.length === 0) {
      toast.error('Selecciona al menos un servicio.');
      return;
    }

    setSaving(true);
    try {
      let customerId = selectedCustomerId;

      if (manualCustomerType === 'NEW') {
        const rawPhone = cleanPhoneNumber(newCustomerPhone);
        if (!newCustomerName || rawPhone.length !== 10) {
          toast.error('Ingresa nombre y teléfono de 10 dígitos.');
          setSaving(false);
          return;
        }

        const resCust = await api.post('/clientes', {
          name: newCustomerName,
          phone: rawPhone,
        });
        customerId = resCust.data.id;
      }

      const [h, m] = manualHour.split(':').map(Number);
      const startTime = new Date(selectedDate);
      startTime.setHours(h, m, 0, 0);

      await api.post('/citas', {
        customerId,
        serviceId: selectedServiceIds[0],
        startTime: startTime.toISOString(),
        notes: `Servicios agendados: ${selectedServiceIds.length} ítem(s). ${manualNotes ? `Notas: ${manualNotes}` : ''}`,
      });

      toast.success('Cita manual registrada con éxito');
      setManualModalOpen(false);
      refetchAgenda();
    } catch (err) {
      console.error('Error creando cita manual:', err);
      toast.error(err.response?.data?.error || 'Error al agendar cita.');
    } finally {
      setSaving(false);
    }
  };

  const totalCobradoReal = appointments
    .filter(
      (c) =>
        c.status === 'COMPLETED' ||
        (c.status === 'CONFIRMED' && !c.advanceRetained)
    )
    .reduce((acc, c) => acc + Number(c.service?.price || 0), 0);

  const totalAnticiposRetenidos = appointments
    .filter((c) => c.status === 'CANCELED' && c.advanceRetained)
    .reduce((acc, c) => acc + Number(c.advancePaymentAmount || 150), 0);

  const ahora = new Date();
  const citasOrdenadas = [...appointments].sort(
    (a, b) => new Date(a.startTime) - new Date(b.startTime)
  );

  const citasProximas = citasOrdenadas.filter((c) => {
    const fin = new Date(c.endTime || c.startTime);
    return (c.status === 'PENDING' || c.status === 'CONFIRMED') && fin > ahora;
  });

  const citasPasadas = citasOrdenadas.filter((c) => {
    const fin = new Date(c.endTime || c.startTime);
    return c.status === 'COMPLETED' || c.status === 'CANCELED' || fin <= ahora;
  });

  const getInitials = (name = '') => {
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const renderCitaCard = (cita, esPasada = false) => {
    const tieneNotasMedicas = Boolean(cita.customer?.medicalNotes);
    const esPendiente = cita.status === 'PENDING';
    const esConfirmada = cita.status === 'CONFIRMED';

    const horaInicioStr = new Date(cita.startTime).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const fotoCliente = cita.customer?.imageUrl || cita.customer?.photo;

    let statusGlowClass =
      'border-stone-200/80 bg-white shadow-2xs hover:border-pink-200';

    if (!esPasada) {
      if (esPendiente) {
        statusGlowClass =
          'border-amber-300/80 bg-amber-50/20 shadow-[0_4px_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-300/60';
      } else if (esConfirmada) {
        statusGlowClass =
          'border-emerald-300/80 bg-emerald-50/20 shadow-[0_4px_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-300/60';
      } else if (cita.status === 'CANCELED') {
        statusGlowClass =
          'border-rose-300/80 bg-rose-50/20 shadow-[0_4px_15px_rgba(244,63,94,0.12)] ring-1 ring-rose-300/50';
      }
    } else {
      statusGlowClass =
        'border-stone-200/60 bg-stone-50/50 opacity-70 shadow-none';
    }

    return (
      <div key={cita.id} className="flex flex-col gap-1.5">
        {tieneNotasMedicas && (
          <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50/60 p-2.5 text-xs text-rose-900 shadow-2xs">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
            <div className="leading-tight">
              <span className="font-semibold text-rose-700">
                Sensibilidad / Alerta:{' '}
              </span>
              <span>{cita.customer.medicalNotes}</span>
            </div>
          </div>
        )}

        <div
          className={`rounded-3xl border p-4 transition-all duration-300 md:p-5 ${statusGlowClass}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative shrink-0">
                {fotoCliente ? (
                  <img
                    src={fotoCliente}
                    alt={cita.customer?.name}
                    className="h-11 w-11 rounded-2xl border border-amber-200/80 object-cover shadow-2xs md:h-12 md:w-12"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200/80 bg-amber-50 font-serif text-sm font-bold text-amber-900 shadow-2xs md:h-12 md:w-12">
                    {getInitials(cita.customer?.name)}
                  </div>
                )}

                <button
                  onClick={() => handleToggleFrequent(cita.customer)}
                  className={`absolute -right-1 -bottom-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border shadow-2xs transition-transform active:scale-90 ${
                    cita.customer?.isFrequent
                      ? 'border-amber-300 bg-amber-100 text-amber-800'
                      : 'border-stone-200 bg-white text-stone-400 hover:text-amber-500'
                  }`}
                  title={
                    cita.customer?.isFrequent
                      ? 'Clienta VIP Frecuente'
                      : 'Marcar como frecuente'
                  }
                >
                  <Star
                    className={`h-3 w-3 ${cita.customer?.isFrequent ? 'fill-amber-500 text-amber-500' : ''}`}
                  />
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <h4 className="truncate font-serif text-base leading-tight font-bold text-stone-800">
                  {cita.customer?.name}
                </h4>
                <p className="mt-0.5 truncate text-xs font-medium text-stone-400">
                  {cita.service?.title}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1">
              <div className="text-salon-primary flex items-center gap-1 rounded-xl border border-pink-200/60 bg-pink-50/80 px-2.5 py-0.5 text-xs font-bold">
                <Clock className="h-3.5 w-3.5 text-pink-500" />
                <span>{horaInicioStr}</span>
              </div>

              <span
                className={`rounded-full px-2.5 py-0.5 text-[9px] font-semibold tracking-wider uppercase ${
                  esConfirmada
                    ? 'border border-emerald-200/80 bg-emerald-50 text-emerald-800'
                    : cita.status === 'COMPLETED'
                      ? 'border border-blue-200/60 bg-blue-50 text-blue-800'
                      : cita.status === 'CANCELED'
                        ? 'border border-rose-200/60 bg-rose-50 text-rose-800'
                        : 'border border-amber-200/80 bg-amber-50 text-amber-800'
                }`}
              >
                {esPendiente
                  ? 'POR CONFIRMAR'
                  : esConfirmada
                    ? 'CONFIRMADA'
                    : cita.status === 'COMPLETED'
                      ? 'COMPLETADA'
                      : cita.status === 'CANCELED'
                        ? 'CANCELADA'
                        : cita.status}
              </span>
            </div>
          </div>

          <div className="mt-3.5 flex items-center justify-between border-t border-stone-100 pt-3">
            <span className="text-salon-primary text-xs font-bold md:text-sm">
              ${Number(cita.service?.price || 0).toFixed(2)} MXN
            </span>

            <div className="flex items-center gap-2">
              {!esPasada ? (
                <button
                  onClick={() => handleToggleAdvanceAndConfirm(cita)}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-2xl px-3 py-1.5 text-xs font-bold shadow-2xs transition-all active:scale-98 ${
                    esConfirmada
                      ? 'border border-emerald-200/80 bg-emerald-50 text-emerald-800'
                      : 'bg-salon-primary text-white shadow-2xs hover:bg-pink-600'
                  }`}
                >
                  <DollarIcon className="h-3.5 w-3.5" />
                  <span>
                    {esConfirmada ? 'Anticipo Validado' : 'Validar Anticipo'}
                  </span>
                </button>
              ) : (
                <span className="text-xs font-medium text-stone-400 italic">
                  Cita concluida
                </span>
              )}

              {cita.status !== 'CANCELED' && (
                <div className="flex items-center gap-1">
                  {cita.status !== 'COMPLETED' && (
                    <button
                      onClick={() =>
                        handleChangeAptStatus(cita.id, 'COMPLETED')
                      }
                      className="flex h-8 cursor-pointer items-center gap-1 rounded-xl border border-blue-200/80 bg-blue-50/60 px-2 text-xs font-semibold text-blue-800 hover:bg-blue-100"
                      title="Finalizar Servicio"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => handleOpenCancelModal(cita)}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-rose-200/80 bg-rose-50/60 text-rose-600 hover:bg-rose-100"
                    title="Cancelar Cita"
                  >
                    <Ban className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto min-h-screen max-w-md bg-[#FAF8F5] pb-28 shadow-xl transition-all md:max-w-4xl lg:max-w-5xl">
      {/* Header Admin */}
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
              AGENDA DIARIA • {user?.nombre || 'Admin'}
            </p>
          </div>
        </div>

        {/* NAVEGACIÓN RÁPIDA EN DESKTOP */}
        <div className="hidden items-center gap-6 text-xs font-semibold text-stone-500 md:flex">
          <span className="text-salon-primary border-salon-primary border-b-2 pb-0.5 font-bold">
            Agenda
          </span>
          <button
            onClick={() => navigate('/admin/horarios')}
            className="hover:text-salon-primary cursor-pointer transition-colors"
          >
            Horarios
          </button>
          <button
            onClick={() => navigate('/admin/clientes')}
            className="hover:text-salon-primary cursor-pointer transition-colors"
          >
            Clientas
          </button>
          <button
            onClick={() => navigate('/admin/servicios')}
            className="hover:text-salon-primary cursor-pointer transition-colors"
          >
            Servicios
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón Push para la Administradora */}
          <button
            onClick={requestAndSubscribe}
            className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-all active:scale-95 ${
              isSubscribed
                ? 'border border-emerald-300 bg-emerald-50 text-emerald-800 shadow-2xs'
                : 'border border-pink-200 bg-pink-50 text-pink-700 hover:bg-pink-100'
            }`}
            title={
              isSubscribed
                ? 'Notificaciones Admin Activas'
                : 'Activar Notificaciones de Citas'
            }
          >
            {isSubscribed ? (
              <>
                <BellCheck className="h-4 w-4 text-emerald-600" />
                <span className="hidden sm:inline">Alertas Admin ON</span>
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 animate-bounce text-pink-600" />
                <span>Activar Alertas</span>
              </>
            )}
          </button>

          <button
            onClick={logout}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-rose-50 text-rose-600 transition-colors hover:bg-rose-100"
            title="Cerrar Sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="px-4 pt-4 md:px-8">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-stone-400 uppercase">
              AGENDA DIARIA
            </span>
            <h2 className="text-salon-primary font-serif text-xl font-bold capitalize md:text-2xl">
              {selectedDate.toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </h2>
          </div>

          <button
            onClick={() => setBlockModalOpen(true)}
            className="text-salon-primary flex cursor-pointer items-center gap-1.5 rounded-2xl border border-pink-200/60 bg-pink-50 px-3.5 py-1.5 text-xs font-semibold shadow-2xs transition-all hover:bg-pink-100 active:scale-95"
          >
            <Utensils className="h-3.5 w-3.5" />
            <span>Bloquear Horario</span>
          </button>
        </div>

        {/* Métricas Rápidas */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-stone-200/80 bg-white p-3.5 shadow-2xs">
            <div className="text-salon-primary flex h-7 w-7 items-center justify-center rounded-xl border border-pink-100 bg-pink-50">
              <CalendarIcon className="h-4 w-4" />
            </div>
            <span className="mt-2 block font-serif text-lg font-bold text-stone-800 md:text-xl">
              {appointments.length}
            </span>
            <span className="text-[10px] font-medium text-stone-400 md:text-xs">
              Citas Hoy
            </span>
          </div>

          <div className="rounded-2xl border border-stone-200/80 bg-white p-3.5 shadow-2xs">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl border border-amber-200/60 bg-amber-50 text-amber-800">
              <DollarSign className="h-4 w-4" />
            </div>
            <span className="mt-2 block font-serif text-lg font-bold text-stone-800 md:text-xl">
              ${totalCobradoReal}
            </span>
            <span className="text-[10px] font-medium text-stone-400 md:text-xs">
              Cobrado Real
            </span>
          </div>

          <div className="rounded-2xl border border-stone-200/80 bg-white p-3.5 shadow-2xs">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl border border-emerald-200/60 bg-emerald-50 text-emerald-800">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="mt-2 block font-serif text-lg font-bold text-stone-800 md:text-xl">
              ${totalAnticiposRetenidos}
            </span>
            <span className="text-[10px] font-medium text-stone-400 md:text-xs">
              Retenido
            </span>
          </div>
        </div>

        {/* Carousel Semanal */}
        <div className="mt-5 rounded-3xl border border-stone-200/80 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between px-1 pb-2">
            <span className="text-[10px] font-bold tracking-wider text-stone-400 uppercase">
              Semana en Curso
            </span>
            <button
              onClick={() => navigate('/admin/horarios')}
              className="text-salon-primary cursor-pointer text-[11px] font-semibold hover:underline"
            >
              Ajustar Horarios »
            </button>
          </div>

          <div className="flex items-center justify-between gap-1">
            <button
              onClick={() => changeDate(-1)}
              className="cursor-pointer p-1 text-stone-400 hover:text-stone-700"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            {[-2, -1, 0, 1, 2].map((offset) => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() + offset);
              const isSelected = offset === 0;

              return (
                <button
                  key={offset}
                  onClick={() => changeDate(offset)}
                  className={`flex cursor-pointer flex-col items-center rounded-2xl px-3.5 py-2 text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-salon-primary text-white shadow-2xs'
                      : 'hover:text-salon-primary bg-stone-50 text-stone-600 hover:bg-pink-50'
                  }`}
                >
                  <span className="text-[9px] uppercase opacity-80">
                    {d.toLocaleDateString('es-ES', { weekday: 'short' })}
                  </span>
                  <span className="text-sm font-bold">{d.getDate()}</span>
                </button>
              );
            })}

            <button
              onClick={() => changeDate(1)}
              className="cursor-pointer p-1 text-stone-400 hover:text-stone-700"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* LISTADO DE AGENDA */}
        <div className="mt-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="border-salon-primary h-8 w-8 animate-spin rounded-full border-3 border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="mt-3 rounded-2xl bg-rose-50 p-4 text-center text-xs font-medium text-rose-600">
              {error}
            </div>
          ) : appointments.length === 0 && timeBlocks.length === 0 ? (
            <div className="mt-3 rounded-3xl border border-stone-200/80 bg-white p-8 text-center shadow-2xs">
              <p className="text-xs font-medium text-stone-500 md:text-sm">
                No hay citas ni bloqueos registrados para este día.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {timeBlocks.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold tracking-wider text-stone-400 uppercase">
                    Bloqueos de Horario ({timeBlocks.length})
                  </span>
                  {timeBlocks.map((block) => (
                    <div
                      key={block.id}
                      className="flex items-center justify-between rounded-2xl border border-pink-200/80 bg-pink-50/40 p-3.5 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-salon-primary flex h-8 w-8 items-center justify-center rounded-xl border border-pink-100 bg-white shadow-2xs">
                          <Utensils className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="font-bold text-stone-800">
                            {new Date(block.startTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            -{' '}
                            {new Date(block.endTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <p className="text-[11px] font-medium text-stone-400">
                            {block.reason}
                          </p>
                        </div>
                      </div>
                      <span className="text-salon-primary rounded-full bg-pink-100 px-2.5 py-0.5 text-[9px] font-bold">
                        BLOQUEADO
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-stone-400 uppercase">
                    <Clock className="text-salon-primary h-3.5 w-3.5" />
                    <span>Próximas Citas ({citasProximas.length})</span>
                  </h3>
                </div>

                {citasProximas.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-stone-200/80 bg-white/50 py-4 text-center text-xs font-medium text-stone-400 italic">
                    No hay citas pendientes o próximas para hoy.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {citasProximas.map((cita) => renderCitaCard(cita, false))}
                  </div>
                )}
              </div>

              {citasPasadas.length > 0 && (
                <div className="flex flex-col gap-3 border-t border-stone-200/80 pt-5">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-stone-400 uppercase">
                      <CheckCheck className="h-3.5 w-3.5 text-stone-400" />
                      <span>Concluidas / Pasadas ({citasPasadas.length})</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {citasPasadas.map((cita) => renderCitaCard(cita, true))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* MODAL DE CANCELACIÓN */}
      {cancelModalOpen && selectedAptToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-stone-100 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-serif text-base font-bold text-stone-800">
                Cancelar Cita
              </h3>
              <button
                onClick={() => setCancelModalOpen(false)}
                className="cursor-pointer text-stone-400 hover:text-stone-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4">
              <p className="text-xs font-bold text-stone-800">
                Clienta: {selectedAptToCancel.customer?.name}
              </p>
              <p className="mt-0.5 text-xs font-medium text-stone-400">
                Servicio: {selectedAptToCancel.service?.title}
              </p>

              <div className="mt-4 rounded-2xl border border-rose-200/80 bg-rose-50/50 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-xs font-bold text-rose-900">
                      Retener Anticipo
                    </span>
                    <span className="block text-[10px] text-rose-700">
                      Aplica por cancelación extemporánea
                    </span>
                  </div>

                  <input
                    type="checkbox"
                    checked={retainAdvance}
                    onChange={(e) => setRetainAdvance(e.target.checked)}
                    className="h-5 w-5 cursor-pointer rounded-md text-rose-600 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="flex-1 cursor-pointer rounded-2xl bg-stone-100 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-200"
                >
                  Volver
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleConfirmCancel}
                  className="flex-1 cursor-pointer rounded-2xl bg-rose-600 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-rose-700 disabled:opacity-50"
                >
                  {saving ? 'Procesando...' : 'Confirmar Cancelación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BLOQUEAR HORARIO */}
      {blockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-stone-100 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-serif text-base font-bold text-stone-800">
                Bloquear Horario
              </h3>
              <button
                onClick={() => setBlockModalOpen(false)}
                className="cursor-pointer text-stone-400 hover:text-stone-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateTimeBlock}
              className="mt-4 flex flex-col gap-3.5"
            >
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-stone-500 uppercase">
                    Hora Inicio *
                  </label>
                  <input
                    type="time"
                    required
                    value={blockStartHour}
                    onChange={(e) => setBlockStartHour(e.target.value)}
                    className="mt-1 w-full cursor-pointer rounded-2xl border border-stone-200/80 p-2.5 text-xs font-medium text-stone-800 focus:border-pink-300 focus:ring-1 focus:ring-pink-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-stone-500 uppercase">
                    Hora Fin *
                  </label>
                  <input
                    type="time"
                    required
                    value={blockEndHour}
                    onChange={(e) => setBlockEndHour(e.target.value)}
                    className="mt-1 w-full cursor-pointer rounded-2xl border border-stone-200/80 p-2.5 text-xs font-medium text-stone-800 focus:border-pink-300 focus:ring-1 focus:ring-pink-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-wider text-stone-500 uppercase">
                  Motivo / Razón *
                </label>
                <input
                  type="text"
                  required
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Ej. Hora de Comida, Asunto Personal"
                  className="mt-1 w-full rounded-2xl border border-stone-200/80 p-2.5 text-xs font-medium text-stone-800 focus:border-pink-300 focus:ring-1 focus:ring-pink-200 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="bg-salon-primary mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-2xl py-3 text-xs font-bold text-white shadow-2xs hover:bg-pink-600 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Guardando...' : 'Confirmar Bloqueo'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NUEVA CITA MANUAL */}
      {manualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="no-scrollbar max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-3xl border border-stone-100 bg-white p-5 shadow-xl md:max-w-md md:p-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3.5">
              <h3 className="font-serif text-base font-bold text-stone-800 md:text-lg">
                Agendar Cita Manual
              </h3>
              <button
                onClick={() => setManualModalOpen(false)}
                className="cursor-pointer text-stone-400 hover:text-stone-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateManualAppointment}
              className="mt-4 flex flex-col gap-3.5"
            >
              <div className="flex rounded-2xl bg-stone-100/70 p-1">
                <button
                  type="button"
                  onClick={() => setManualCustomerType('EXISTING')}
                  className={`flex-1 cursor-pointer rounded-xl py-2 text-xs font-bold transition-all ${
                    manualCustomerType === 'EXISTING'
                      ? 'bg-white text-stone-800 shadow-2xs'
                      : 'text-stone-400'
                  }`}
                >
                  Clienta Existente
                </button>
                <button
                  type="button"
                  onClick={() => setManualCustomerType('NEW')}
                  className={`flex-1 cursor-pointer rounded-xl py-2 text-xs font-bold transition-all ${
                    manualCustomerType === 'NEW'
                      ? 'bg-white text-stone-800 shadow-2xs'
                      : 'text-stone-400'
                  }`}
                >
                  + Nueva Clienta
                </button>
              </div>

              {manualCustomerType === 'EXISTING' ? (
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-stone-500 uppercase">
                    Seleccionar Clienta *
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="mt-1 w-full cursor-pointer rounded-2xl border border-stone-200/80 p-2.5 text-xs font-medium text-stone-800 focus:border-pink-300 focus:ring-1 focus:ring-pink-200 focus:outline-none"
                  >
                    {customersList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[10px] font-bold tracking-wider text-stone-500 uppercase">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      placeholder="Ej. Sofía Morales"
                      className="mt-1 w-full rounded-2xl border border-stone-200/80 p-2.5 text-xs font-medium text-stone-800 focus:border-pink-300 focus:ring-1 focus:ring-pink-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold tracking-wider text-stone-500 uppercase">
                      Teléfono WhatsApp *
                    </label>
                    <input
                      type="tel"
                      required
                      value={newCustomerPhone}
                      onChange={(e) =>
                        setNewCustomerPhone(formatPhoneNumber(e.target.value))
                      }
                      placeholder="55 1234 5678"
                      className="mt-1 w-full rounded-2xl border border-stone-200/80 p-2.5 text-xs font-medium text-stone-800 focus:border-pink-300 focus:ring-1 focus:ring-pink-200 focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-[10px] font-bold tracking-wider text-stone-500 uppercase">
                  Servicios a Incluir ({selectedServiceIds.length}) *
                </label>
                <div className="no-scrollbar mt-1 flex max-h-36 flex-col gap-1.5 overflow-y-auto rounded-2xl border border-stone-200/80 p-2">
                  {servicesList.map((s) => {
                    const isSelected = selectedServiceIds.includes(s.id);
                    return (
                      <div
                        key={s.id}
                        onClick={() => toggleServiceSelection(s.id)}
                        className={`flex cursor-pointer items-center justify-between rounded-xl p-2 text-xs font-medium transition-all ${
                          isSelected
                            ? 'border border-pink-200 bg-pink-50 font-bold text-stone-800'
                            : 'bg-stone-50/60 text-stone-500 hover:bg-stone-100'
                        }`}
                      >
                        <span>{s.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-salon-primary text-[11px] font-bold">
                            ${Number(s.price).toFixed(2)}
                          </span>
                          <div
                            className={`flex h-4 w-4 items-center justify-center rounded-md border ${isSelected ? 'bg-salon-primary border-salon-primary text-white' : 'border-stone-300'}`}
                          >
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-wider text-stone-500 uppercase">
                  Hora de Cita *
                </label>
                <input
                  type="time"
                  required
                  value={manualHour}
                  onChange={(e) => setManualHour(e.target.value)}
                  className="mt-1 w-full cursor-pointer rounded-2xl border border-stone-200/80 p-2.5 text-xs font-medium text-stone-800 focus:border-pink-300 focus:ring-1 focus:ring-pink-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-wider text-stone-500 uppercase">
                  Notas Opcionales
                </label>
                <textarea
                  rows={2}
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Ej. Agendado por llamada..."
                  className="mt-1 w-full rounded-2xl border border-stone-200/80 p-2 text-xs font-medium text-stone-800 focus:border-pink-300 focus:ring-1 focus:ring-pink-200 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="bg-salon-primary mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-2xl py-3 text-xs font-bold text-white shadow-2xs hover:bg-pink-600 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Agendando...' : 'Agendar Cita Manual'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Botón Flotante */}
      <button
        onClick={() => setManualModalOpen(true)}
        className="bg-salon-primary fixed right-5 bottom-20 z-30 flex cursor-pointer items-center gap-2 rounded-full px-5 py-3 text-xs font-bold text-white shadow-lg transition-all hover:bg-pink-600 active:scale-95"
      >
        <Plus className="h-5 w-5" />
        <span>Nueva Cita</span>
      </button>

      {/* Navegación Inferior Admin */}
      <nav className="fixed right-0 bottom-0 left-0 z-30 border-t border-stone-200/60 bg-white/95 py-2.5 shadow-lg backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-md items-center justify-around">
          <button className="text-salon-primary flex cursor-pointer flex-col items-center">
            <CalendarIcon className="h-5 w-5" />
            <span className="mt-0.5 text-[10px] font-bold">Agenda</span>
          </button>
          <button
            onClick={() => navigate('/admin/horarios')}
            className="hover:text-salon-primary flex cursor-pointer flex-col items-center text-stone-400 transition-colors"
          >
            <Clock className="h-5 w-5" />
            <span className="mt-0.5 text-[10px] font-medium">Horarios</span>
          </button>
          <button
            onClick={() => navigate('/admin/clientes')}
            className="hover:text-salon-primary flex cursor-pointer flex-col items-center text-stone-400 transition-colors"
          >
            <Users className="h-5 w-5" />
            <span className="mt-0.5 text-[10px] font-medium">Clientes</span>
          </button>
          <button
            onClick={() => navigate('/admin/servicios')}
            className="hover:text-salon-primary flex cursor-pointer flex-col items-center text-stone-400 transition-colors"
          >
            <Scissors className="h-5 w-5" />
            <span className="mt-0.5 text-[10px] font-medium">Servicios</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
