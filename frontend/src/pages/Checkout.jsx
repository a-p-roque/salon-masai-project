import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import CrossSellWidget from '../components/CrossSellWidget';
import { formatPhoneNumber, cleanPhoneNumber } from '../utils/formatters';
import {
  Trash2,
  Clock,
  Copy,
  CheckCircle2,
  ArrowLeft,
  Building2,
  ShieldCheck,
  User,
  Phone,
  Sparkles,
  Award,
  ChevronRight,
  CalendarDays,
  Info,
  Sun,
  Moon,
  MapPin,
  MessageCircle,
} from 'lucide-react';

const formatDuration = (totalMinutes) => {
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

const SALON_INFO = {
  address: 'Av. Revolución 123, Col. Centro, Ciudad de México',
  bankName: 'BBVA Bancomer',
  accountHolder: 'Salón Masai Spa',
  clabe: '012180015489321099',
  whatsappPhone: '525512345678',
};

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);

  const [cart, setCart] = useState(location.state?.cart || []);
  const [allServices, setAllServices] = useState([]);

  const [customerName, setCustomerName] = useState(user?.nombre || '');
  const [customerPhone, setCustomerPhone] = useState(
    user?.telefono ? formatPhoneNumber(user.telefono) : ''
  );

  const [availableDays] = useState(getNext14Days());
  const [selectedDayObj, setSelectedDayObj] = useState(availableDays[0]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotMessage, setSlotMessage] = useState('');

  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [whatsappUrlReady, setWhatsappUrlReady] = useState('');

  useEffect(() => {
    if (!location.state?.cart || location.state.cart.length === 0) {
      navigate('/catalogo');
    }
  }, [location.state, navigate]);

  useEffect(() => {
    api
      .get('/servicios')
      .then((res) => setAllServices(res.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (currentStep !== 2) return;

    let isMounted = true;

    const fetchDisponibilidad = async () => {
      setLoadingSlots(true);
      setSlotMessage('');
      try {
        const totalDuration = cart.reduce((acc, s) => acc + s.durationMin, 0);
        const res = await api.get('/citas/disponibilidad', {
          params: {
            fecha: selectedDayObj.isoDate,
            duracionTotalMin: totalDuration,
          },
        });

        if (isMounted) {
          if (!res.data.isOpen) {
            setAvailableSlots([]);
            setSlotMessage(
              res.data.mensaje ||
                'El salón no se encuentra abierto en esta fecha.'
            );
            setSelectedTime('');
          } else {
            setAvailableSlots(res.data.slots);
            if (res.data.slots.length === 0) {
              setSlotMessage(
                'No hay horarios disponibles para esta fecha. Intenta seleccionando otro día.'
              );
              setSelectedTime('');
            } else {
              setSelectedTime(res.data.slots[0]);
            }
          }
        }
      } catch (err) {
        console.error('Error obteniendo disponibilidad:', err);
        if (isMounted) {
          setAvailableSlots([]);
          setSlotMessage('Error al consultar disponibilidad.');
          setSelectedTime('');
        }
      } finally {
        if (isMounted) {
          setLoadingSlots(false);
        }
      }
    };

    if (cart.length > 0) {
      fetchDisponibilidad();
    }

    return () => {
      isMounted = false;
    };
  }, [selectedDayObj, cart, currentStep]);

  const toggleServiceInCart = (service) => {
    if (cart.some((item) => item.id === service.id)) {
      setCart(cart.filter((item) => item.id !== service.id));
    } else {
      setCart([...cart, service]);
    }
  };

  const removeFromCart = (serviceId) => {
    const updated = cart.filter((s) => s.id !== serviceId);
    setCart(updated);
    if (updated.length === 0) navigate('/catalogo');
  };

  const totalAmount = cart.reduce((acc, s) => acc + Number(s.price), 0);
  const totalDuration = cart.reduce((acc, s) => acc + s.durationMin, 0);
  const totalAdvance = cart.reduce(
    (acc, s) => acc + Number(s.price) * (s.advancePaymentPercent ?? 0.2),
    0
  );
  const remainingToPay = totalAmount - totalAdvance;
  const estimatedPoints = Math.floor(totalAmount / 20);

  const handleStep1Next = (e) => {
    e.preventDefault();
    const rawPhone = cleanPhoneNumber(customerPhone);
    if (!customerName.trim() || rawPhone.length !== 10) {
      toast.error('Ingresa tu nombre y un teléfono válido de 10 dígitos.');
      return;
    }
    setCurrentStep(2);
  };

  const handleConfirmAppointment = async (e) => {
    e.preventDefault();

    const rawPhone = cleanPhoneNumber(customerPhone);

    if (!customerName.trim() || rawPhone.length !== 10) {
      toast.error('Ingresa tu nombre y un teléfono de 10 dígitos.');
      return;
    }
    if (!selectedTime) {
      toast.error('Por favor selecciona un horario.');
      return;
    }

    setLoading(true);
    try {
      const [timeStr, modifier] = selectedTime.split(' ');
      let [hours, minutes] = timeStr.split(':').map(Number);
      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;

      const startTimeObj = new Date(selectedDayObj.dateObj);
      startTimeObj.setHours(hours, minutes, 0, 0);

      const appointmentData = {
        customerId: user?.id || null,
        customerName: user ? undefined : customerName.trim(),
        customerPhone: user ? undefined : rawPhone,
        serviceId: cart[0].id,
        startTime: startTimeObj.toISOString(),
        status: 'PENDING',
        notes: `Reserva Web. Servicios: ${cart.map((s) => s.title).join(', ')}. Anticipo via SPEI`,
      };

      await api.post('/citas', appointmentData);

      const servicesText = cart.map((s) => s.title).join(', ');
      const message = `Hola Salón Masai ✨, acabo de agendar una cita:\n\n👤 *Nombre:* ${customerName.trim()}\n💇‍♀️ *Servicio:* ${servicesText}\n📅 *Fecha:* ${selectedDayObj.fullLabel} a las ${selectedTime}\n💳 *Anticipo a transferir:* $${totalAdvance.toFixed(2)} MXN\n\nAdjunto mi comprobante de pago para validar la reserva.`;

      const whatsappUrl = `https://wa.me/${SALON_INFO.whatsappPhone}?text=${encodeURIComponent(message)}`;

      setWhatsappUrlReady(whatsappUrl);
      toast.success(
        '¡Cita registrada con éxito! Toca el botón para enviar tu comprobante.',
        { duration: 5000, icon: '✨' }
      );
    } catch (err) {
      console.error('Error al agendar:', err);
      toast.error(
        err.response?.data?.error || 'Ocurrió un error al procesar tu reserva.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) return null;

  return (
    <div className="mx-auto min-h-screen max-w-md bg-[#FAF8F5] pb-28 shadow-xl transition-all md:max-w-4xl lg:max-w-5xl">
      <header className="sticky top-0 z-20 border-b border-stone-200/60 bg-[#FAF8F5]/90 px-4 py-3.5 backdrop-blur-md md:px-8">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              if (currentStep > 1) setCurrentStep(currentStep - 1);
              else navigate('/catalogo');
            }}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-stone-200/80 bg-white text-stone-700 shadow-2xs transition-transform hover:bg-stone-100 active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <img
              src="/logo.jpg"
              alt="Salón Masai Logo"
              className="h-8 w-8 rounded-full border border-stone-200 object-cover shadow-2xs"
            />
            <div>
              <h1 className="font-serif text-sm font-bold text-stone-800">
                Salón Masai
              </h1>
              <p className="text-[8px] font-bold tracking-wider text-stone-400 uppercase">
                CONFIRMAR CITA • PASO {currentStep} DE 3
              </p>
            </div>
          </div>

          <div className="w-9"></div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1 px-2 md:mx-auto md:max-w-md">
          <div
            className={`h-1 rounded-full transition-all ${
              currentStep >= 1 ? 'bg-salon-primary' : 'bg-stone-200'
            }`}
          />
          <div
            className={`h-1 rounded-full transition-all ${
              currentStep >= 2 ? 'bg-salon-primary' : 'bg-stone-200'
            }`}
          />
          <div
            className={`h-1 rounded-full transition-all ${
              currentStep >= 3 ? 'bg-salon-primary' : 'bg-stone-200'
            }`}
          />
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 items-start gap-6 px-4 md:grid-cols-12 md:px-8">
        <div className="flex flex-col gap-4 md:col-span-5">
          <div className="rounded-3xl border border-stone-200/80 bg-white p-4 shadow-2xs md:p-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h2 className="font-serif text-sm font-bold text-stone-800 md:text-base">
                Tu Reserva
              </h2>
              <span className="text-salon-primary rounded-full border border-pink-200/60 bg-pink-50 px-2.5 py-0.5 text-[10px] font-bold">
                {cart.length} {cart.length === 1 ? 'servicio' : 'servicios'}
              </span>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-2xl border border-stone-100 bg-stone-50 p-3"
                >
                  <div>
                    <h3 className="text-xs font-bold text-stone-800 md:text-sm">
                      {item.title}
                    </h3>
                    <div className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-stone-400 md:text-xs">
                      <Clock className="text-salon-primary h-3 w-3" />
                      <span>{formatDuration(item.durationMin)}</span>
                    </div>
                    <span className="text-salon-primary mt-1 block text-xs font-bold md:text-sm">
                      ${Number(item.price).toFixed(2)} MXN
                    </span>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="cursor-pointer p-2 text-stone-400 transition-colors hover:text-rose-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <CrossSellWidget
              cart={cart}
              allServices={allServices}
              onToggleService={toggleServiceInCart}
            />

            <div className="mt-4 border-t border-stone-100 pt-3 text-xs md:text-sm">
              <div className="flex justify-between text-stone-500">
                <span>Duración estimada:</span>
                <span className="font-bold text-stone-800">
                  {formatDuration(totalDuration)}
                </span>
              </div>
              <div className="mt-1 flex justify-between text-stone-500">
                <span>Subtotal total:</span>
                <span className="font-bold text-stone-800">
                  ${totalAmount.toFixed(2)} MXN
                </span>
              </div>
              <div className="text-salon-primary mt-1 flex justify-between font-bold">
                <span>Anticipo de garantía:</span>
                <span className="font-bold">
                  ${totalAdvance.toFixed(2)} MXN
                </span>
              </div>

              <div className="mt-3 rounded-2xl border border-pink-200/60 bg-pink-50/50 p-3 text-center">
                <span className="block text-[10px] font-bold tracking-wider text-stone-400 uppercase">
                  Restante a liquidar en Salón
                </span>
                <p className="text-salon-primary font-serif text-lg font-bold md:text-xl">
                  ${remainingToPay.toFixed(2)} MXN
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-stone-200/80 bg-white p-4 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-amber-200/60 bg-amber-50 text-amber-800">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-stone-800">
                  Ubicación de tu cita
                </h4>
                <p className="mt-0.5 text-[11px] leading-snug font-medium text-stone-500">
                  {SALON_INFO.address}
                </p>
              </div>
            </div>
          </div>

          {!user ? (
            <div className="rounded-3xl border border-pink-200/60 bg-linear-to-r from-pink-50/80 via-white to-pink-50/80 p-4 shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="text-salon-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-pink-200/60 bg-pink-100/60">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-stone-800 md:text-sm">
                    ✨ Sumarás +{estimatedPoints} Puntos Masai
                  </h3>
                  <p className="mt-0.5 text-[11px] leading-tight font-medium text-stone-400 md:text-xs">
                    Inicia sesión para acumular puntos canjeables por
                    tratamientos.
                  </p>
                  <button
                    onClick={() => navigate('/login')}
                    className="bg-salon-primary mt-2 cursor-pointer rounded-xl px-3 py-1.5 text-[10px] font-bold text-white shadow-2xs hover:bg-pink-600"
                  >
                    Iniciar Sesión
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-3xl border border-amber-200/80 bg-amber-50/50 p-4 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200/60 bg-amber-100 text-amber-800">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-amber-900 uppercase">
                    Socio Masai Club
                  </span>
                  <p className="text-xs font-bold text-stone-800 md:text-sm">
                    ¡Sumarás +{estimatedPoints} Puntos con esta cita!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="md:col-span-7">
          {currentStep === 1 && (
            <div className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-2xs md:p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-sm font-bold text-stone-800 md:text-base">
                  Paso 1: Datos de Contacto
                </h2>
              </div>

              <form
                onSubmit={handleStep1Next}
                className="mt-4 flex flex-col gap-4"
              >
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-stone-500 uppercase md:text-xs">
                    Nombre Completo *
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ej. Valeria Montoya"
                      className="w-full rounded-2xl border border-stone-200/80 py-3 pr-3 pl-10 text-xs font-medium text-stone-800 focus:border-pink-300 focus:ring-1 focus:ring-pink-200 focus:outline-none md:text-sm"
                    />
                    <User className="absolute top-3.5 left-3.5 h-4 w-4 text-stone-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-stone-500 uppercase md:text-xs">
                    Teléfono WhatsApp (10 dígitos) *
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) =>
                        setCustomerPhone(formatPhoneNumber(e.target.value))
                      }
                      placeholder="55 1234 5678"
                      className="w-full rounded-2xl border border-stone-200/80 py-3 pr-3 pl-10 text-xs font-medium text-stone-800 focus:border-pink-300 focus:ring-1 focus:ring-pink-200 focus:outline-none md:text-sm"
                    />
                    <Phone className="absolute top-3.5 left-3.5 h-4 w-4 text-stone-400" />
                  </div>
                </div>

                <button
                  type="submit"
                  className="bg-salon-primary mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-bold text-white shadow-2xs hover:bg-pink-600 active:scale-98 md:text-sm"
                >
                  <span>Elegir Fecha & Hora</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </form>
            </div>
          )}

          {currentStep === 2 && (
            <div className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-2xs md:p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-sm font-bold text-stone-800 md:text-base">
                  Paso 2: Selección de Fecha & Hora
                </h2>
              </div>

              <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-2">
                {availableDays.map((d) => (
                  <button
                    key={d.isoDate}
                    onClick={() => setSelectedDayObj(d)}
                    className={`flex shrink-0 cursor-pointer flex-col items-center rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all ${
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

              <div className="mt-4">
                {loadingSlots ? (
                  <div className="flex justify-center py-8">
                    <div className="border-salon-primary h-8 w-8 animate-spin rounded-full border-3 border-t-transparent"></div>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 text-center text-xs font-semibold text-amber-900 md:text-sm">
                    {slotMessage ||
                      'No hay horarios disponibles para esta fecha.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {availableSlots.map((time) => {
                      const isPM = time.includes('PM');
                      return (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`flex cursor-pointer items-center justify-between rounded-2xl border p-3 text-xs font-bold transition-all md:text-sm ${
                            selectedTime === time
                              ? 'border-salon-primary text-salon-primary bg-pink-50 shadow-2xs'
                              : 'border-stone-200/80 bg-white text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            {isPM ? (
                              <Moon className="h-3.5 w-3.5 text-indigo-400" />
                            ) : (
                              <Sun className="h-3.5 w-3.5 text-amber-500" />
                            )}
                            <span>{time}</span>
                          </div>
                          <CheckCircle2
                            className={`h-4 w-4 ${
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

              <button
                onClick={() => {
                  if (!selectedTime) {
                    toast.error('Selecciona un horario.');
                    return;
                  }
                  setCurrentStep(3);
                }}
                disabled={!selectedTime}
                className="bg-salon-primary mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-bold text-white shadow-2xs hover:bg-pink-600 active:scale-98 disabled:opacity-50 md:text-sm"
              >
                <span>Continuar a Garantía</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {currentStep === 3 && (
            <div className="rounded-3xl border border-amber-200/80 bg-linear-to-br from-amber-50/40 via-white to-amber-50/20 p-5 shadow-2xs md:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-amber-900">
                  <ShieldCheck className="h-5 w-5 text-amber-600" />
                  <h2 className="font-serif text-sm font-bold md:text-base">
                    Anticipo de Garantía (SPEI)
                  </h2>
                </div>
                <span className="text-base font-bold text-amber-900 md:text-lg">
                  ${totalAdvance.toFixed(2)} MXN
                </span>
              </div>

              <div className="mt-4 flex flex-col gap-3">
                <div className="rounded-2xl border border-pink-200/80 bg-white p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="text-salon-primary h-5 w-5" />
                      <span className="text-xs font-bold text-stone-800 md:text-sm">
                        Transferencia Interbancaria SPEI
                      </span>
                    </div>
                    <span className="rounded-full border border-emerald-200/60 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                      Sin comisión
                    </span>
                  </div>

                  <div className="mt-3 rounded-2xl border border-pink-200/60 bg-pink-50/50 p-3 text-xs md:text-sm">
                    <div className="mb-2 grid grid-cols-2 gap-2 text-stone-600">
                      <div>
                        <span className="block text-[9px] font-bold text-stone-400 uppercase">
                          Banco:
                        </span>
                        <span className="font-bold text-stone-800">
                          {SALON_INFO.bankName}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-stone-400 uppercase">
                          Titular:
                        </span>
                        <span className="font-bold text-stone-800">
                          {SALON_INFO.accountHolder}
                        </span>
                      </div>
                    </div>

                    <p className="block text-[9px] font-bold text-stone-400 uppercase">
                      CLABE Interbancaria:
                    </p>
                    <div className="mt-1 flex items-center justify-between rounded-xl border border-pink-200/60 bg-white p-2 font-mono font-bold text-stone-800">
                      <span className="tracking-wider">
                        {SALON_INFO.clabe.replace(/(.{4})/g, '$1 ').trim()}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(SALON_INFO.clabe);
                          setCopied(true);
                          toast.success('CLABE copiada');
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="bg-salon-primary flex cursor-pointer items-center gap-1 rounded-xl px-2.5 py-1 font-sans text-[10px] font-bold text-white shadow-2xs hover:bg-pink-600"
                      >
                        <Copy className="h-3 w-3" />
                        <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-3.5 text-xs text-amber-900">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-[11px] leading-snug font-medium md:text-xs">
                  Al presionar el botón, tu solicitud se registrará y te
                  redirigiremos automáticamente a <strong>WhatsApp</strong> para
                  enviar el comprobante de pago de tu anticipo.
                </p>
              </div>

              <div className="mt-3 rounded-2xl border border-pink-200/80 bg-pink-50/60 p-3.5 text-xs md:text-sm">
                <div className="flex items-center gap-2 font-bold text-pink-950">
                  <CalendarDays className="text-salon-primary h-4 w-4" />
                  <span>
                    {selectedDayObj.fullLabel} a las {selectedTime}
                  </span>
                </div>
                <p className="mt-1 text-[11px] font-medium text-stone-500 md:text-xs">
                  A nombre de: <strong>{customerName}</strong> ({customerPhone})
                </p>
              </div>

              {whatsappUrlReady ? (
                <a
                  href={whatsappUrlReady}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-sm font-bold text-white shadow-lg transition-all hover:bg-emerald-700 active:scale-98"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span>Abrir WhatsApp para enviar comprobante 💬</span>
                </a>
              ) : (
                <button
                  onClick={handleConfirmAppointment}
                  disabled={loading}
                  className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-xs font-bold text-white shadow-2xs transition-all hover:bg-emerald-700 active:scale-98 disabled:opacity-50 md:text-sm"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>
                    {loading
                      ? 'Procesando...'
                      : 'Solicitar Cita & Enviar Comprobante por WA'}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
