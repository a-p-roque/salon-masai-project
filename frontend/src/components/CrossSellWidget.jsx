import { Sparkles, Plus } from 'lucide-react';

export default function CrossSellWidget({
  cart,
  allServices,
  onToggleService,
}) {
  if (cart.length === 0 || allServices.length === 0) return null;

  // Obtener categorías actualmente presentes en el carrito
  const cartCategories = new Set(cart.map((s) => s.category));

  // Buscar servicios de una categoría DIAMETRALMENTE DIFERENTE que no estén en el carrito
  const candidateServices = allServices.filter(
    (s) =>
      !cartCategories.has(s.category) && !cart.some((item) => item.id === s.id)
  );

  // Si no hay categorías distintas, buscar cualquier servicio no agregado
  const fallbackServices = allServices.filter(
    (s) => !cart.some((item) => item.id === s.id)
  );

  const suggestedService = candidateServices[0] || fallbackServices[0];

  if (!suggestedService) return null;

  return (
    <div className="mt-4 rounded-3xl border border-amber-200/80 bg-linear-to-r from-amber-50/60 via-pink-50/40 to-amber-50/60 p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-amber-900">
          <Sparkles className="h-4 w-4 text-amber-600" />
          <span className="text-[10px] font-bold tracking-wider uppercase">
            ¿Sabías que también ofrecemos?
          </span>
        </div>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-900">
          Recomendación Masai
        </span>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-3">
        <div>
          <span className="text-salon-secondary text-[9px] font-bold uppercase">
            {suggestedService.category}
          </span>
          <h4 className="text-salon-dark text-xs font-bold">
            {suggestedService.title}
          </h4>
          <p className="text-salon-muted mt-0.5 text-[10px]">
            Complementa tu experiencia por solo{' '}
            <strong className="text-salon-primary">
              ${Number(suggestedService.price).toFixed(2)} MXN
            </strong>
          </p>
        </div>

        <button
          onClick={() => onToggleService(suggestedService)}
          className="flex shrink-0 items-center gap-1 rounded-xl bg-amber-800 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-amber-900"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Probar</span>
        </button>
      </div>
    </div>
  );
}
