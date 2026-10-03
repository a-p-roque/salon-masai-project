import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Utensils,
  Calendar as CalendarIcon,
  Users,
  Scissors,
  Check,
  X,
  Clock,
  Lock,
} from 'lucide-react';

const DIAS_SEMANA = [
  { dayOfWeek: 1, name: 'Lunes', short: 'L' },
  { dayOfWeek: 2, name: 'Martes', short: 'M' },
  { dayOfWeek: 3, name: 'Miércoles', short: 'Mi' },
  { dayOfWeek: 4, name: 'Jueves', short: 'J' },
  { dayOfWeek: 5, name: 'Viernes', short: 'V' },
  { dayOfWeek: 6, name: 'Sábado', short: 'S' },
  { dayOfWeek: 0, name: 'Domingo', short: 'D' },
];

export default function AdminBusinessHours() {
  const navigate = useNavigate();
  const [businessHours, setBusinessHours] = useState([]);
  const [timeBlocks, setTimeBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal para Bloqueo Recurrente o Día Completo
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockType, setBlockType] = useState('RECURRING'); // 'RECURRING' | 'FULL_DAY'
  const [reason, setReason] = useState('');
  const [startHour, setStartHour] = useState('13:00');
  const [endHour, setEndHour] = useState('15:00');

  // Toggles de Días de la semana seleccionados (Por defecto Lunes a Sábado)
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5, 6]);
  const [fullDayDate, setFullDayDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const [hoursRes, blocksRes] = await Promise.all([
          api.get('/horarios-negocio'),
          api.get('/bloqueos'),
        ]);

        if (isMounted) {
          setBusinessHours(hoursRes.data);
          setTimeBlocks(blocksRes.data);
        }
      } catch (err) {
        console.error('Error al cargar horarios:', err);
        toast.error('Error al obtener la configuración de horarios.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const refetchData = async () => {
    try {
      const [hoursRes, blocksRes] = await Promise.all([
        api.get('/horarios-negocio'),
        api.get('/bloqueos'),
      ]);
      setBusinessHours(hoursRes.data);
      setTimeBlocks(blocksRes.data);
    } catch (err) {
      console.error('Error al recargar:', err);
    }
  };

  const handleToggleDaySelection = (dayOfWeek) => {
    if (selectedDays.includes(dayOfWeek)) {
      if (selectedDays.length === 1) {
        toast.error('Debes seleccionar al menos un día.');
        return;
      }
      setSelectedDays(selectedDays.filter((d) => d !== dayOfWeek));
    } else {
      setSelectedDays([...selectedDays, dayOfWeek]);
    }
  };

  const handleUpdateDayHour = async (dayOfWeek, data) => {
    try {
      await api.put(`/horarios-negocio/${dayOfWeek}`, data);
      toast.success('Horario actualizado con éxito');
      refetchData();
    } catch (err) {
      console.error('Error actualizando día:', err);
      toast.error('No se pudo guardar el horario.');
    }
  };

  const handleCreateBlock = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Ingresa el motivo del bloqueo.');
      return;
    }

    setSaving(true);
    try {
      if (blockType === 'FULL_DAY') {
        if (!fullDayDate) {
          toast.error('Selecciona la fecha a bloquear.');
          setSaving(false);
          return;
        }
        const startStr = `${fullDayDate}T00:00:00.000`;
        const endStr = `${fullDayDate}T23:59:59.999`;

        await api.post('/bloqueos', {
          startTime: new Date(startStr).toISOString(),
          endTime: new Date(endStr).toISOString(),
          reason,
          isRecurring: false,
          isFullDay: true,
        });
      } else {
        const todayStr = new Date().toISOString().split('T')[0];
        const startStr = `${todayStr}T${startHour}:00.000`;
        const endStr = `${todayStr}T${endHour}:00.000`;

        const nombresDias = selectedDays
          .map(
            (dayNum) => DIAS_SEMANA.find((d) => d.dayOfWeek === dayNum)?.short
          )
          .join(', ');

        await api.post('/bloqueos', {
          startTime: new Date(startStr).toISOString(),
          endTime: new Date(endStr).toISOString(),
          reason: `${reason} (${nombresDias})`,
          isRecurring: true,
          recurrence: selectedDays.length === 6 ? 'DAILY' : 'CUSTOM',
          isFullDay: false,
        });
      }

      toast.success('Bloqueo de horario registrado');
      setBlockModalOpen(false);
      setReason('');
      refetchData();
    } catch (err) {
      console.error('Error al crear bloqueo:', err);
      toast.error('Error al registrar bloqueo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBlock = async (id) => {
    try {
      await api.delete(`/bloqueos/${id}`);
      toast.success('Horario desbloqueado correctamente');
      refetchData();
    } catch (err) {
      console.error('Error al eliminar bloqueo:', err);
      toast.error('No se pudo desbloquear el horario.');
    }
  };

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
              AJUSTE DE HORARIOS & BLOQUEOS
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
          <span className="text-salon-primary border-salon-primary border-b-2 pb-0.5 font-bold">
            Horarios
          </span>
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

        <button
          onClick={() => {
            setReason('');
            setBlockModalOpen(true);
          }}
          className="bg-salon-primary flex cursor-pointer items-center gap-1.5 rounded-2xl px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition-all hover:bg-pink-600 hover:shadow-xs active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Bloquear Horario</span>
        </button>
      </header>

      <main className="flex flex-col gap-8 px-4 pt-4 md:px-8">
        {/* 1. Horario General de Apertura */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-widest text-stone-400 uppercase">
              HORARIO REGULAR DE APERTURA
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="border-salon-primary h-8 w-8 animate-spin rounded-full border-3 border-t-transparent"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {DIAS_SEMANA.map((d) => {
                const config = businessHours.find(
                  (bh) => bh.dayOfWeek === d.dayOfWeek
                ) || {
                  isOpen: d.dayOfWeek !== 0,
                  openTime: '10:00',
                  closeTime: '19:00',
                };

                return (
                  <div
                    key={d.dayOfWeek}
                    className={`flex items-center justify-between rounded-2xl border p-3.5 text-xs transition-all ${
                      config.isOpen
                        ? 'border-stone-200/80 bg-white shadow-2xs'
                        : 'border-stone-200/50 bg-stone-100/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          handleUpdateDayHour(d.dayOfWeek, {
                            ...config,
                            isOpen: !config.isOpen,
                          })
                        }
                        className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl font-bold transition-colors ${
                          config.isOpen
                            ? 'border border-emerald-200/60 bg-emerald-50 text-emerald-700'
                            : 'bg-stone-200/80 text-stone-500'
                        }`}
                        title={
                          config.isOpen
                            ? 'Marcar como Cerrado'
                            : 'Marcar como Abierto'
                        }
                      >
                        {config.isOpen ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </button>

                      <div>
                        <span className="text-sm font-bold text-stone-800">
                          {d.name}
                        </span>
                        <p className="text-[11px] font-medium text-stone-400">
                          {config.isOpen
                            ? `${config.openTime} hrs - ${config.closeTime} hrs`
                            : 'CERRADO'}
                        </p>
                      </div>
                    </div>

                    {config.isOpen && (
                      <div className="flex items-center gap-1.5 rounded-xl border border-stone-200/60 bg-stone-50/80 p-1.5">
                        <input
                          type="time"
                          value={config.openTime}
                          onChange={(e) =>
                            handleUpdateDayHour(d.dayOfWeek, {
                              ...config,
                              openTime: e.target.value,
                            })
                          }
                          className="cursor-pointer bg-transparent text-xs font-bold text-stone-800 focus:outline-none"
                        />
                        <span className="text-stone-300">-</span>
                        <input
                          type="time"
                          value={config.closeTime}
                          onChange={(e) =>
                            handleUpdateDayHour(d.dayOfWeek, {
                              ...config,
                              closeTime: e.target.value,
                            })
                          }
                          className="cursor-pointer bg-transparent text-xs font-bold text-stone-800 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Bloqueos Activos & Recurrentes */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-widest text-stone-400 uppercase">
              BLOQUEOS ACTIVOS & RECURRENTES
            </span>
            <span className="text-salon-primary rounded-full border border-pink-200/60 bg-pink-50 px-2.5 py-0.5 text-xs font-medium">
              {timeBlocks.length} Activos
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {timeBlocks.length === 0 ? (
              <div className="rounded-3xl border border-stone-200/60 bg-white p-6 text-center text-xs font-medium text-stone-500 md:col-span-2 md:text-sm">
                No hay bloqueos recurrentes ni días festivos configurados.
              </div>
            ) : (
              timeBlocks.map((block) => (
                <div
                  key={block.id}
                  className="flex items-center justify-between rounded-2xl border border-pink-200/60 bg-pink-50/40 p-3.5 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-salon-primary flex h-9 w-9 items-center justify-center rounded-xl border border-pink-100 bg-white shadow-2xs">
                      {block.isFullDay ? (
                        <Lock className="h-4 w-4 text-rose-500" />
                      ) : (
                        <Utensils className="text-salon-primary h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-stone-800">
                          {block.reason}
                        </span>
                        {block.isRecurring && (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-semibold text-amber-800">
                            RECURRENTE
                          </span>
                        )}
                        {block.isFullDay && (
                          <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[9px] font-semibold text-rose-800">
                            DÍA COMPLETO
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] font-medium text-stone-400">
                        {block.isFullDay
                          ? new Date(block.startTime).toLocaleDateString(
                              'es-ES',
                              {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                              }
                            )
                          : `${new Date(block.startTime).toLocaleTimeString(
                              [],
                              {
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )} - ${new Date(block.endTime).toLocaleTimeString(
                              [],
                              {
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )}`}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteBlock(block.id)}
                    className="cursor-pointer p-1.5 text-stone-400 transition-colors hover:text-rose-600"
                    title="Desbloquear"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* MODAL BLOQUEAR RECURRENTE O DÍA COMPLETO */}
      {blockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-stone-100 bg-white p-5 shadow-xl md:max-w-md md:p-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3.5">
              <h3 className="font-serif text-base font-bold text-stone-800 md:text-lg">
                Nuevo Bloqueo de Horario
              </h3>
              <button
                onClick={() => setBlockModalOpen(false)}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-stone-400 transition-colors hover:text-stone-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateBlock}
              className="mt-4 flex flex-col gap-3.5"
            >
              <div className="flex rounded-2xl bg-stone-100/70 p-1">
                <button
                  type="button"
                  onClick={() => setBlockType('RECURRING')}
                  className={`flex-1 cursor-pointer rounded-xl py-2 text-xs font-bold transition-all ${
                    blockType === 'RECURRING'
                      ? 'bg-white text-stone-800 shadow-2xs'
                      : 'text-stone-400'
                  }`}
                >
                  Horario Recurrente
                </button>
                <button
                  type="button"
                  onClick={() => setBlockType('FULL_DAY')}
                  className={`flex-1 cursor-pointer rounded-xl py-2 text-xs font-bold transition-all ${
                    blockType === 'FULL_DAY'
                      ? 'bg-white text-stone-800 shadow-2xs'
                      : 'text-stone-400'
                  }`}
                >
                  Día Completo
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-wider text-stone-500 uppercase">
                  Motivo / Razón *
                </label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ej. Salida personal, comida, mantenimiento..."
                  className="mt-1 w-full rounded-2xl border border-stone-200/80 p-2.5 text-xs font-medium text-stone-800 focus:border-pink-300 focus:ring-1 focus:ring-pink-200 focus:outline-none"
                />
              </div>

              {blockType === 'RECURRING' ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold tracking-wider text-stone-500 uppercase">
                        Hora Inicio *
                      </label>
                      <input
                        type="time"
                        required
                        value={startHour}
                        onChange={(e) => setStartHour(e.target.value)}
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
                        value={endHour}
                        onChange={(e) => setEndHour(e.target.value)}
                        className="mt-1 w-full cursor-pointer rounded-2xl border border-stone-200/80 p-2.5 text-xs font-medium text-stone-800 focus:border-pink-300 focus:ring-1 focus:ring-pink-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Toggles Interactivos para Días de la Semana */}
                  <div>
                    <label className="mb-1 block text-[10px] font-bold tracking-wider text-stone-500 uppercase">
                      Aplica los Días *
                    </label>
                    <div className="flex justify-between gap-1">
                      {DIAS_SEMANA.map((d) => {
                        const isSelected = selectedDays.includes(d.dayOfWeek);
                        return (
                          <button
                            key={d.dayOfWeek}
                            type="button"
                            onClick={() =>
                              handleToggleDaySelection(d.dayOfWeek)
                            }
                            className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-xs font-bold transition-all ${
                              isSelected
                                ? 'bg-salon-primary text-white shadow-2xs'
                                : 'bg-stone-100 text-stone-400 hover:bg-stone-200'
                            }`}
                          >
                            {d.short}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-stone-500 uppercase">
                    Fecha a Bloquear *
                  </label>
                  <input
                    type="date"
                    required
                    value={fullDayDate}
                    onChange={(e) => setFullDayDate(e.target.value)}
                    className="mt-1 w-full cursor-pointer rounded-2xl border border-stone-200/80 p-2.5 text-xs font-medium text-stone-800 focus:border-pink-300 focus:ring-1 focus:ring-pink-200 focus:outline-none"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="bg-salon-primary mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-2xl py-3 text-xs font-bold text-white shadow-2xs transition-all hover:bg-pink-600 active:scale-98 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Guardando...' : 'Aplicar Bloqueo'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Navegación Inferior Admin (Solo Móviles) */}
      <nav className="fixed right-0 bottom-0 left-0 z-30 border-t border-stone-200/60 bg-white/95 py-2.5 shadow-lg backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-md items-center justify-around">
          <button
            onClick={() => navigate('/admin/agenda')}
            className="hover:text-salon-primary flex cursor-pointer flex-col items-center text-stone-400 transition-colors"
          >
            <CalendarIcon className="h-5 w-5" />
            <span className="mt-0.5 text-[10px] font-medium">Agenda</span>
          </button>
          <button className="text-salon-primary flex cursor-pointer flex-col items-center">
            <Clock className="h-5 w-5" />
            <span className="mt-0.5 text-[10px] font-bold">Horarios</span>
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
