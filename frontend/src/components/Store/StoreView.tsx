import React, { useEffect, useMemo, useState } from 'react';
import { fetchJSON } from '../../lib/fetchJSON';
import ProductCard, { Product } from './ProductCard';

const StoreView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState<'todos' | 'fisico' | 'digital'>('todos');

  useEffect(() => {
    fetchJSON<Product[]>('/api/products')
      .then((d) => setProducts(Array.isArray(d) ? d : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (tipo !== 'todos' && p.tipo !== tipo) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!p.nombre.toLowerCase().includes(q) && !(p.descripcion || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [products, search, tipo]);

  return (
    <div>
      {/* Barra de filtros */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-8 flex flex-col lg:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Buscar libro, apunte, material…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition text-sm"
          />
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {(['todos', 'fisico', 'digital'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTipo(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                tipo === t ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {t === 'todos' ? 'Todos' : t === 'fisico' ? '📦 Físicos' : '⬇ Digitales'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
              <div className="h-44 bg-gray-200" />
              <div className="p-5 space-y-3">
                <div className="h-5 bg-gray-200 rounded-full w-3/4" />
                <div className="h-4 bg-gray-100 rounded-full w-1/2" />
                <div className="h-9 bg-gray-100 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-2xl border-2 border-dashed border-gray-200">
          <div className="text-6xl mb-4">{products.length === 0 ? '🛍️' : '🔍'}</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            {products.length === 0 ? 'Tienda en preparación' : 'Sin resultados'}
          </h3>
          <p className="text-gray-400 text-sm">
            {products.length === 0
              ? 'Los libros, apuntes y materiales van a aparecer acá en cuanto se publiquen.'
              : 'Probá con otro término o cambiá el filtro.'}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-400 mb-5 font-medium">
            {filtered.length} {filtered.length === 1 ? 'producto' : 'productos'} disponibles
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p, idx) => (
              <ProductCard key={p.id} product={p} idx={idx} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default StoreView;
