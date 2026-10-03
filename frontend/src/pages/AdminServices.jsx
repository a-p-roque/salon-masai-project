import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  Scissors,
  Plus,
  Edit2,
  Power,
  Clock,
  ArrowLeft,
  Save,
  X,
  Users,
  Sparkles,
  Star,
  Camera,
  CalendarDays,
} from 'lucide-react';

export default function AdminServices() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);

  // Formulario
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [durationMin, setDurationMin] = useState('60');
  const [category, setCategory] = useState('');
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [advancePercent, setAdvancePercent] = useState('0.2');
  const [isPromotion, setIsPromotion] = useState(false);

  // Prioridad simplificada: 'NORMAL' (0), 'RECOMMENDED' (10), 'TOP' (50)
  const [priorityLevel, setPriorityLevel] = useState('0');
  const [saving, setSaving] = useState(false);

  // Extraer categorías dinámicas existentes de la base de datos
  const existingCategories = Array.from(
    new Set(services.map((s) => s.category).filter(Boolean))
  );

  useEffect(() => {
    let isMounted = true;

    const loadServices = async () => {
      setLoading(true);
      try {
        const res = await api.get('/servicios?includeInactive=true');
        if (isMounted) {
          setServices(res.data);
        }
      } catch (err) {
        console.error('Error al cargar servicios:', err);
        toast.error('No se pudieron cargar los servicios.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadServices();

    return () => {
      isMounted = false;
    };
  }, []);

  const refetchServices = async () => {
    try {
      const res = await api.get('/servicios?includeInactive=true');
      setServices(res.data);
    } catch (err) {
      console.error('Error al recargar servicios:', err);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenModal = (service = null) => {
    if (service) {
      setEditingService(service);
      setTitle(service.title);
      setDescription(service.description || '');
      setPrice(service.price);
      setDurationMin(service.durationMin);
      setCategory(service.category);
      setIsCustomCategory(false);
      setImageUrl(service.imageUrl || '');
      setAdvancePercent(service.advancePaymentPercent || 0.2);
      setIsPromotion(service.isPromotion || false);
      setPriorityLevel(String(service.highlightPriority || 0));
    } else {
      setEditingService(null);
      setTitle('');
      setDescription('');
      setPrice('');
      setDurationMin('60');
      setCategory(existingCategories[0] || 'CABELLO');
      setIsCustomCategory(false);
      setNewCategoryInput('');
      setImageUrl('');
      setAdvancePercent('0.2');
      setIsPromotion(false);
      setPriorityLevel('0');
    }
    setModalOpen(true);
  };

  const handleToggleStatus = async (id) => {
    try {
      await api.patch(`/servicios/${id}/toggle-status`);
      toast.success('Estado del servicio actualizado');
      refetchServices();
    } catch (err) {
      console.error('Error al cambiar disponibilidad:', err);
      toast.error('Error al cambiar disponibilidad');
    }
  };

  const handleTogglePromotion = async (id) => {
    try {
      await api.patch(`/servicios/${id}/toggle-promotion`);
      toast.success('Promoción de portada actualizada');
      refetchServices();
    } catch (err) {
      console.error('Error al cambiar promoción:', err);
      toast.error('Error al cambiar promoción');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const finalCategory = isCustomCategory
      ? newCategoryInput.trim().toUpperCase()
      : category;

    if (!finalCategory) {
      toast.error('Debes definir o seleccionar una categoría.');
      setSaving(false);
      return;
    }

    try {
      const payload = {
        title,
        description,
        price,
        durationMin,
        category: finalCategory,
        imageUrl,
        advancePaymentPercent: advancePercent,
        isPromotion,
        highlightPriority: Number(priorityLevel),
      };

      if (editingService) {
        await api.put(`/servicios/${editingService.id}`, payload);
        toast.success('Servicio editado con éxito');
      } else {
        await api.post('/servicios', payload);
        toast.success('Nuevo servicio creado con éxito');
      }

      setModalOpen(false);
      refetchServices();
    } catch (err) {
      console.error('Error guardando servicio:', err);
      toast.error('Error al guardar el servicio.');
    } finally {
      setSaving(false);
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
              GESTIÓN DE SERVICIOS
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
          <button
            onClick={() => navigate('/admin/clientes')}
            className="hover:text-salon-primary cursor-pointer transition-colors"
          >
            Clientas
          </button>
          <span className="text-salon-primary border-salon-primary border-b-2 pb-0.5 font-bold">
            Servicios
          </span>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="bg-salon-primary flex cursor-pointer items-center gap-1.5 rounded-2xl px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition-all hover:bg-pink-600 hover:shadow-xs active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Servicio</span>
        </button>
      </header>

      <main className="px-4 pt-4 md:px-8">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-widest text-stone-400 uppercase">
            CATÁLOGO DE SERVICIOS
          </span>
          <span className="text-salon-primary rounded-full border border-pink-200/60 bg-pink-50 px-3 py-1 text-xs font-medium">
            {services.length} Registrados
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="border-salon-primary h-8 w-8 animate-spin rounded-full border-3 border-t-transparent"></div>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <div
                key={service.id}
                className={`flex flex-col justify-between rounded-3xl border p-4 transition-all duration-200 hover:border-pink-200 hover:shadow-xs ${
                  service.isActive
                    ? 'border-stone-200/80 bg-white shadow-2xs'
                    : 'border-stone-200/60 bg-stone-100/50 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {service.imageUrl ? (
                        <img
                          src={service.imageUrl}
                          alt={service.title}
                          className="h-14 w-14 rounded-2xl border border-stone-200/80 object-cover shadow-2xs"
                        />
                      ) : (
                        <div className="text-salon-primary flex h-14 w-14 items-center justify-center rounded-2xl border border-pink-100/80 bg-pink-50">
                          <Scissors className="h-6 w-6" />
                        </div>
                      )}

                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[9px] font-bold tracking-wider text-stone-400 uppercase">
                            {service.category}
                          </span>
                          {service.isPromotion && (
                            <span className="flex items-center gap-0.5 rounded-full border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-[8px] font-bold text-amber-800">
                              <Sparkles className="h-2.5 w-2.5 text-amber-500" />{' '}
                              PROMO
                            </span>
                          )}
                          {service.highlightPriority > 0 && (
                            <span className="text-salon-primary flex items-center gap-0.5 rounded-full border border-pink-100 bg-pink-50 px-1.5 py-0.5 text-[8px] font-bold">
                              <Star className="fill-salon-primary text-salon-primary h-2.5 w-2.5" />{' '}
                              {service.highlightPriority >= 50
                                ? 'TOP'
                                : `P${service.highlightPriority}`}
                            </span>
                          )}
                        </div>

                        <h3 className="mt-0.5 font-serif text-sm leading-snug font-bold text-stone-800 md:text-base">
                          {service.title}
                        </h3>
                        <div className="mt-1 flex items-center gap-3 text-xs">
                          <span className="text-salon-primary font-bold">
                            ${Number(service.price).toFixed(2)} MXN
                          </span>
                          <span className="flex items-center gap-1 text-[11px] font-medium text-stone-400">
                            <Clock className="h-3 w-3" />
                            {service.durationMin}m
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {service.description && (
                    <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed font-normal text-stone-500">
                      {service.description}
                    </p>
                  )}
                </div>

                {/* Acciones del Servicio */}
                <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                      service.isActive
                        ? 'border border-emerald-200/60 bg-emerald-50 text-emerald-700'
                        : 'bg-stone-200/60 text-stone-600'
                    }`}
                  >
                    {service.isActive ? 'Disponible' : 'Pausado'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleTogglePromotion(service.id)}
                      className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl transition-all active:scale-95 ${
                        service.isPromotion
                          ? 'border border-amber-200/80 bg-amber-50 text-amber-800 hover:bg-amber-100'
                          : 'bg-stone-100/80 text-stone-400 hover:bg-amber-50 hover:text-amber-700'
                      }`}
                      title={
                        service.isPromotion
                          ? 'Quitar de Promoción Portada'
                          : 'Marcar como Promoción Portada'
                      }
                    >
                      <Sparkles className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleToggleStatus(service.id)}
                      className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl transition-all active:scale-95 ${
                        service.isActive
                          ? 'border border-emerald-200/60 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-stone-200/80 text-stone-600 hover:bg-stone-300'
                      }`}
                      title={
                        service.isActive
                          ? 'Pausar servicio'
                          : 'Activar servicio'
                      }
                    >
                      <Power className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleOpenModal(service)}
                      className="hover:text-salon-primary flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl bg-stone-100 text-stone-700 transition-all hover:bg-pink-50 active:scale-95"
                      title="Editar Servicio"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL CREAR / EDITAR SERVICIO */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="no-scrollbar max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-stone-100 bg-white p-5 shadow-xl md:p-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3.5">
              <h3 className="font-serif text-base font-bold text-stone-800 md:text-lg">
                {editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-stone-400 transition-colors hover:text-stone-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-4 flex flex-col gap-3.5"
            >
              {/* Foto de Servicio */}
              <div className="text-center">
                <div className="relative mx-auto h-20 w-20">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="Previsualización"
                      className="h-20 w-20 rounded-2xl border border-amber-200 object-cover shadow-2xs"
                    />
                  ) : (
                    <div className="text-salon-primary flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50">
                      <Scissors className="h-8 w-8" />
                    </div>
                  )}

                  <label className="bg-salon-primary absolute -right-1 -bottom-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-white shadow-md transition-transform hover:bg-pink-600 active:scale-90">
                    <Camera className="h-3.5 w-3.5" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <span className="mt-1 block text-[10px] font-medium text-stone-400">
                  Toca la cámara para subir foto
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-wider text-stone-500 uppercase">
                  Nombre del Servicio *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej. Balayage Signature"
                  className="mt-1 w-full rounded-2xl border border-stone-200/80 p-2.5 text-xs font-medium text-stone-800 focus:border-pink-300 focus:ring-1 focus:ring-pink-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-wider text-stone-500 uppercase">
                  Descripción Corta
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej. Incluye diagnóstico capilar, matiz y matizador hidratante..."
                  className="mt-1 w-full rounded-2xl border border-stone-200/80 p-2.5 text-xs font-medium text-stone-800 focus:border-pink-300 focus:ring-1 focus:ring-pink-200 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-stone-500 uppercase">
                    Precio (MXN) *
                  </label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="1200"
                    className="mt-1 w-full rounded-2xl border border-stone-200/80 p-2.5 text-xs font-medium text-stone-800 focus:border-pink-300 focus:ring-1 focus:ring-pink-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-stone-500 uppercase">
                    Duración (Min) *
                  </label>
                  <input
                    type="number"
                    required
                    value={durationMin}
                    onChange={(e) => setDurationMin(e.target.value)}
                    placeholder="90"
                    className="mt-1 w-full rounded-2xl border border-stone-200/80 p-2.5 text-xs font-medium text-stone-800 focus:border-pink-300 focus:ring-1 focus:ring-pink-200 focus:outline-none"
                  />
                </div>
              </div>

              {/* Categorías Dinámicas */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-[10px] font-bold tracking-wider text-stone-500 uppercase">
                    Categoría *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomCategory(!isCustomCategory)}
                    className="text-salon-primary flex cursor-pointer items-center gap-1 rounded-xl bg-pink-50 px-2.5 py-1 text-[10px] font-semibold transition-all hover:bg-pink-100"
                  >
                    {isCustomCategory ? (
                      '« Elegir Existente'
                    ) : (
                      <>
                        <Plus className="h-3 w-3" /> Nueva Categoría
                      </>
                    )}
                  </button>
                </div>

                {isCustomCategory ? (
                  <input
                    type="text"
                    required
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    placeholder="Ej. LASH LIFTING, FACIALES..."
                    className="mt-1 w-full rounded-2xl border border-stone-200/80 p-2.5 text-xs font-medium text-stone-800 focus:border-pink-300 focus:ring-1 focus:ring-pink-200 focus:outline-none"
                  />
                ) : (
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-stone-200/80 p-2.5 text-xs font-medium text-stone-800 focus:border-pink-300 focus:ring-1 focus:ring-pink-200 focus:outline-none"
                  >
                    {existingCategories.length > 0 ? (
                      existingCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))
                    ) : (
                      <option value="CABELLO">CABELLO</option>
                    )}
                  </select>
                )}
              </div>

              {/* Selector de Prioridad Visual */}
              <div>
                <label className="mb-1 block text-[10px] font-bold tracking-wider text-stone-500 uppercase">
                  Prioridad en Catálogo
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPriorityLevel('0')}
                    className={`cursor-pointer rounded-2xl border p-2 text-center text-xs font-semibold transition-all ${
                      priorityLevel === '0'
                        ? 'border-salon-primary text-salon-primary bg-pink-50 font-bold shadow-2xs'
                        : 'border-stone-200 bg-stone-50/50 text-stone-500'
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriorityLevel('10')}
                    className={`cursor-pointer rounded-2xl border p-2 text-center text-xs font-semibold transition-all ${
                      priorityLevel === '10'
                        ? 'border-amber-300 bg-amber-50 font-bold text-amber-900 shadow-2xs'
                        : 'border-stone-200 bg-stone-50/50 text-stone-500'
                    }`}
                  >
                    Recomendado
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriorityLevel('50')}
                    className={`cursor-pointer rounded-2xl border p-2 text-center text-xs font-semibold transition-all ${
                      priorityLevel === '50'
                        ? 'text-salon-primary border-pink-300 bg-pink-50 font-bold shadow-2xs'
                        : 'border-stone-200 bg-stone-50/50 text-stone-500'
                    }`}
                  >
                    ✨ Top Portada
                  </button>
                </div>
              </div>

              <div className="mt-1 flex items-center gap-2 rounded-2xl border border-amber-200/80 bg-amber-50/60 p-3">
                <input
                  type="checkbox"
                  id="isPromotion"
                  checked={isPromotion}
                  onChange={(e) => setIsPromotion(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded-md text-amber-800"
                />
                <label
                  htmlFor="isPromotion"
                  className="cursor-pointer text-xs font-semibold text-amber-900"
                >
                  ✨ Marcar como Servicio en Promoción Portada
                </label>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="bg-salon-primary mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-2xl py-3 text-xs font-bold text-white shadow-2xs transition-all hover:bg-pink-600 active:scale-98 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Guardando...' : 'Guardar Servicio'}</span>
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
          <button
            onClick={() => navigate('/admin/clientes')}
            className="hover:text-salon-primary flex cursor-pointer flex-col items-center text-stone-400 transition-colors"
          >
            <Users className="h-5 w-5" />
            <span className="mt-0.5 text-[10px] font-medium">Clientes</span>
          </button>
          <button className="text-salon-primary flex cursor-pointer flex-col items-center">
            <Scissors className="h-5 w-5" />
            <span className="mt-0.5 text-[10px] font-bold">Servicios</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
