import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  Users,
  Search,
  ShieldAlert,
  Phone,
  Award,
  ArrowLeft,
  X,
  Save,
  Scissors,
  CalendarDays,
  Clock,
  MessageCircle,
  ChevronRight,
  Star,
} from 'lucide-react';

export default function AdminCustomers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Estado para Modal de Expediente / Edición
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editMedicalNotes, setEditMedicalNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadCustomers = async () => {
      setLoading(true);
      try {
        const res = await api.get('/clientes');
        if (isMounted) {
          setCustomers(res.data);
        }
      } catch (err) {
        console.error('Error al cargar directorio de clientes:', err);
        if (isMounted) {
          toast.error('Error al cargar directorio de clientas.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCustomers();

    return () => {
      isMounted = false;
    };
  }, []);

  const refetchCustomers = async () => {
    try {
      const res = await api.get('/clientes');
      setCustomers(res.data);
    } catch (err) {
      console.error('Error al recargar clientes:', err);
    }
  };

  const handleToggleFrequent = async (customer) => {
    try {
      const newStatus = !customer.isFrequent;
      await api.patch(`/clientes/${customer.id}/perfil`, {
        isFrequent: newStatus,
      });
      toast.success(
        newStatus
          ? 'Clienta marcada como Frecuente ⭐'
          : 'Estatus frecuente removido'
      );
      refetchCustomers();
      if (selectedCustomer && selectedCustomer.id === customer.id) {
        setSelectedCustomer({ ...selectedCustomer, isFrequent: newStatus });
      }
    } catch (err) {
      console.error('Error al cambiar status frecuente:', err);
      toast.error('No se pudo actualizar la categoría frecuente.');
    }
  };

  const handleOpenExpediente = (customer) => {
    setSelectedCustomer(customer);
    setEditMedicalNotes(customer.medicalNotes || '');
  };

  const handleSaveMedicalNotes = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/clientes/${selectedCustomer.id}/perfil`, {
        medicalNotes: editMedicalNotes,
      });
      refetchCustomers();
      setSelectedCustomer((prev) => ({
        ...prev,
        medicalNotes: editMedicalNotes,
      }));
      toast.success('Notas médicas actualizadas con éxito.', { icon: '✨' });
    } catch (err) {
      console.error('Error actualizando notas:', err);
      toast.error('No se pudieron actualizar las notas.');
    } finally {
      setSaving(false);
    }
  };

  const openWhatsApp = (phone) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/52${cleanPhone}`, '_blank');
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
  );

  return (
    <div className="mx-auto min-h-screen max-w-md bg-[#FAF8F5] pb-28 shadow-xl transition-all md:max-w-4xl lg:max-w-5xl">
      {/* Header Admin */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-stone-200/60 bg-[#FAF8F5]/90 px-4 py-3.5 backdrop-blur-md md:px-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/agenda')}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-stone-200/80 bg-white text-stone-700 shadow-2xs transition-all hover:bg-stone-100 active:scale-95"
            title="Volver a Agenda"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="font-serif text-base font-bold text-stone-800 md:text-lg">
              Salón Masai
            </h1>
            <p className="text-[9px] font-bold tracking-wider text-stone-400 uppercase">
              DIRECTORIO DE CLIENTAS
            </p>
          </div>
        </div>

        {/* NAVEGACIÓN RÁPIDA EN DESKTOP */}
        <div className="hidden items-center gap-6 text-xs font-semibold text-stone-500 md:flex">
          <button
            onClick={() => navigate('/admin/agenda')}
            className="hover:text-salon-primary cursor-pointer transition-colors"
          >
            Agenda
          </button>
          <button
            onClick={() => navigate('/admin/horarios')}
            className="hover:text-salon-primary cursor-pointer transition-colors"
          >
            Horarios
          </button>
          <span className="text-salon-primary border-salon-primary border-b-2 pb-0.5 font-bold">
            Clientas
          </span>
          <button
            onClick={() => navigate('/admin/servicios')}
            className="hover:text-salon-primary cursor-pointer transition-colors"
          >
            Servicios
          </button>
        </div>

        <span className="text-salon-primary rounded-full border border-pink-200/60 bg-pink-50 px-3 py-1 text-xs font-medium">
          {customers.length} Registradas
        </span>
      </header>

      <main className="px-4 pt-4 md:px-8">
        {/* Buscador */}
        <div className="relative">
          <Search className="absolute top-3.5 left-4 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o celular..."
            className="w-full rounded-2xl border border-stone-200/80 bg-white py-3 pr-4 pl-11 text-xs font-medium text-stone-800 placeholder-stone-400 shadow-2xs transition-all focus:border-pink-400 focus:ring-1 focus:ring-pink-300 focus:outline-none md:text-sm"
          />
        </div>

        {/* Lista de Clientes */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="border-salon-primary h-8 w-8 animate-spin rounded-full border-3 border-t-transparent"></div>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-stone-200/60 bg-white p-8 text-center shadow-2xs">
            <p className="text-xs font-medium text-stone-500 md:text-sm">
              No se encontraron clientas registradas.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredCustomers.map((c) => {
              const totalCitas = c.appointments?.length || 0;
              const tieneAlertas = Boolean(c.medicalNotes);

              return (
                <div
                  key={c.id}
                  className="flex flex-col justify-between rounded-3xl border border-stone-200/70 bg-white p-4 shadow-2xs transition-all duration-200 hover:border-pink-200 hover:shadow-xs md:p-5"
                >
                  <div>
                    {/* Header Card */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        {c.imageUrl ? (
                          <img
                            src={c.imageUrl}
                            alt={c.name}
                            className="h-12 w-12 rounded-2xl border border-stone-200 object-cover shadow-2xs md:h-13 md:w-13"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-200/60 bg-amber-50/80 font-serif text-sm font-bold text-amber-900 shadow-2xs md:h-13 md:w-13 md:text-base">
                            {c.name ? c.name.slice(0, 2).toUpperCase() : 'CL'}
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-serif text-sm leading-tight font-bold text-stone-800 md:text-base">
                              {c.name}
                            </h3>
                            {c.isFrequent && (
                              <span className="flex items-center gap-0.5 rounded-full border border-amber-200 bg-amber-100/80 px-2 py-0.5 text-[9px] font-semibold text-amber-900">
                                <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                                VIP
                              </span>
                            )}
                          </div>

                          {/* Botón WhatsApp */}
                          <button
                            onClick={() => openWhatsApp(c.phone)}
                            className="mt-1 flex cursor-pointer items-center gap-1.5 text-xs font-medium text-stone-500 transition-colors hover:text-emerald-600"
                            title="Chat directo por WhatsApp"
                          >
                            <Phone className="h-3 w-3 text-stone-400" />
                            <span>{c.phone}</span>
                            <MessageCircle className="h-3 w-3 text-emerald-500 opacity-80" />
                          </button>
                        </div>
                      </div>

                      {/* Toggle Frecuente */}
                      <button
                        onClick={() => handleToggleFrequent(c)}
                        className={`cursor-pointer rounded-xl px-2.5 py-1 text-[10px] font-semibold transition-all md:text-xs ${
                          c.isFrequent
                            ? 'border border-amber-200 bg-amber-100/60 text-amber-900 hover:bg-amber-100'
                            : 'bg-stone-100/70 text-stone-500 hover:bg-stone-100 hover:text-stone-700'
                        }`}
                      >
                        {c.isFrequent ? '⭐ Frecuente' : '+ Frecuente'}
                      </button>
                    </div>

                    {/* Alertas Médicas Resaltadas pero delicadas */}
                    {tieneAlertas && (
                      <div className="mt-3 flex items-start gap-2 rounded-2xl border border-rose-200/80 bg-rose-50/50 p-2.5 text-xs text-rose-900">
                        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
                        <span className="line-clamp-2 leading-tight">
                          <strong className="block text-[10px] font-semibold text-rose-700 uppercase">
                            Sensibilidad:
                          </strong>
                          {c.medicalNotes}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Footer Card */}
                  <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-[11px] font-medium text-stone-500 md:text-xs">
                        <CalendarDays className="h-3.5 w-3.5 text-stone-400" />
                        {totalCitas} {totalCitas === 1 ? 'cita' : 'citas'}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-800 md:text-xs">
                        <Award className="h-3.5 w-3.5 text-amber-500" />
                        {c.loyaltyPoints || 0} pts
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenExpediente(c)}
                      className="text-salon-primary flex cursor-pointer items-center gap-0.5 text-xs font-semibold transition-colors hover:text-pink-600"
                    >
                      <span>Expediente</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MODAL EXPEDIENTE LIMPIO & ELEGANTE */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="no-scrollbar max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-stone-100 bg-white p-5 shadow-xl md:max-w-lg md:p-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3.5">
              <h3 className="font-serif text-base font-bold text-stone-800 md:text-lg">
                Expediente de Clienta
              </h3>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-stone-400 transition-colors hover:text-stone-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 text-center">
              {selectedCustomer.imageUrl ? (
                <img
                  src={selectedCustomer.imageUrl}
                  alt={selectedCustomer.name}
                  className="mx-auto h-18 w-18 rounded-2xl border border-amber-200 object-cover shadow-2xs"
                />
              ) : (
                <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-2xl border border-amber-200/80 bg-amber-50 font-serif text-xl font-bold text-amber-900 shadow-2xs">
                  {selectedCustomer.name
                    ? selectedCustomer.name.slice(0, 2).toUpperCase()
                    : 'CL'}
                </div>
              )}
              <h4 className="mt-2.5 font-serif text-lg font-bold text-stone-800">
                {selectedCustomer.name}
              </h4>

              <div className="mt-1 flex items-center justify-center gap-2">
                <p className="text-xs font-medium text-stone-500 md:text-sm">
                  {selectedCustomer.phone}
                </p>
                <button
                  onClick={() => openWhatsApp(selectedCustomer.phone)}
                  className="flex cursor-pointer items-center gap-1 rounded-full border border-emerald-200/60 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 transition-all hover:bg-emerald-100"
                >
                  <MessageCircle className="h-3 w-3 text-emerald-600" />
                  <span>WhatsApp</span>
                </button>
              </div>

              <div className="mt-3 flex justify-center gap-2">
                <span className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-1 text-xs font-semibold text-amber-900">
                  🏆 +{selectedCustomer.loyaltyPoints || 0} Puntos Masai
                </span>
                <button
                  onClick={() => handleToggleFrequent(selectedCustomer)}
                  className={`cursor-pointer rounded-xl border px-3 py-1 text-xs font-semibold transition-all ${
                    selectedCustomer.isFrequent
                      ? 'border-amber-200 bg-amber-100/70 text-amber-900'
                      : 'border-stone-200 bg-stone-50 text-stone-600'
                  }`}
                >
                  {selectedCustomer.isFrequent
                    ? '⭐ Clienta Frecuente'
                    : '+ Marcar Frecuente'}
                </button>
              </div>
            </div>

            {/* Editar Alerta Médica */}
            <form
              onSubmit={handleSaveMedicalNotes}
              className="mt-5 rounded-2xl border border-rose-200/70 bg-rose-50/40 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-rose-800 uppercase">
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                  Alerta Médica / Sensibilidades
                </span>
              </div>
              <textarea
                rows={2}
                value={editMedicalNotes}
                onChange={(e) => setEditMedicalNotes(e.target.value)}
                placeholder="Ej. Alergia al amoníaco, cuero cabelludo sensible..."
                className="mt-2 w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs font-medium text-stone-800 focus:border-pink-300 focus:ring-1 focus:ring-pink-200 focus:outline-none"
              />
              <button
                type="submit"
                disabled={saving}
                className="bg-salon-primary mt-2.5 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold text-white shadow-2xs transition-all hover:bg-pink-600 disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{saving ? 'Guardando...' : 'Guardar Alerta'}</span>
              </button>
            </form>

            {/* Historial de Citas */}
            <div className="mt-6">
              <h5 className="border-b border-stone-100 pb-1.5 font-serif text-sm font-bold text-stone-800">
                Historial de Citas ({selectedCustomer.appointments?.length || 0}
                )
              </h5>

              <div className="mt-3 flex max-h-48 flex-col gap-2 overflow-y-auto pr-1">
                {selectedCustomer.appointments?.length === 0 ? (
                  <p className="py-4 text-center text-xs font-medium text-stone-400">
                    Sin citas registradas aún.
                  </p>
                ) : (
                  selectedCustomer.appointments?.map((apt) => (
                    <div
                      key={apt.id}
                      className="rounded-2xl border border-stone-200/60 bg-stone-50/50 p-3 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-stone-800">
                          {apt.service?.title}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                            apt.status === 'CONFIRMED' ||
                            apt.status === 'COMPLETED'
                              ? 'border border-emerald-200/60 bg-emerald-50 text-emerald-700'
                              : 'border border-amber-200/60 bg-amber-50 text-amber-800'
                          }`}
                        >
                          {apt.status === 'CONFIRMED'
                            ? 'CONFIRMADA'
                            : apt.status === 'COMPLETED'
                              ? 'COMPLETADA'
                              : apt.status === 'PENDING'
                                ? 'PENDIENTE'
                                : apt.status}
                        </span>
                      </div>
                      <div className="mt-1 flex justify-between text-xs font-medium text-stone-400">
                        <span>
                          {new Date(apt.startTime).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="text-salon-primary font-bold">
                          ${Number(apt.service?.price || 0).toFixed(2)} MXN
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navegación Inferior Admin (Solo en Móviles) */}
      <nav className="fixed right-0 bottom-0 left-0 z-30 border-t border-stone-200/60 bg-white/95 py-2.5 shadow-lg backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-md items-center justify-around">
          <button
            onClick={() => navigate('/admin/agenda')}
            className="hover:text-salon-primary flex cursor-pointer flex-col items-center text-stone-400 transition-colors"
          >
            <CalendarDays className="h-5 w-5" />
            <span className="mt-0.5 text-[10px] font-medium">Agenda</span>
          </button>
          <button
            onClick={() => navigate('/admin/horarios')}
            className="hover:text-salon-primary flex cursor-pointer flex-col items-center text-stone-400 transition-colors"
          >
            <Clock className="h-5 w-5" />
            <span className="mt-0.5 text-[10px] font-medium">Horarios</span>
          </button>
          <button className="text-salon-primary flex cursor-pointer flex-col items-center">
            <Users className="h-5 w-5" />
            <span className="mt-0.5 text-[10px] font-bold">Clientes</span>
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
