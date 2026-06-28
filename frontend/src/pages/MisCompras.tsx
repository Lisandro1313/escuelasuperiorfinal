import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface Order {
  id: number;
  product_id: number;
  product_nombre: string;
  product_imagen?: string | null;
  product_tipo: 'fisico' | 'digital';
  cantidad: number;
  amount: number;
  tipo: 'fisico' | 'digital';
  status: 'pending' | 'paid' | 'failed';
  created_at: string;
}

const formatARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

const STATUS: Record<string, { label: string; cls: string }> = {
  paid: { label: 'Pagado', cls: 'bg-green-100 text-green-700' },
  pending: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700' },
  failed: { label: 'Rechazado', cls: 'bg-red-100 text-red-700' },
};

const MisCompras: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/orders/mine', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setOrders(Array.isArray(d) ? d : []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  const descargar = async (id: number) => {
    try {
      const res = await fetch(`/api/orders/${id}/download`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      const d = await res.json();
      if (res.ok && d.url) window.open(d.url, '_blank');
      else alert(d.error || 'No se pudo descargar');
    } catch {
      alert('No se pudo descargar');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-1">Mis compras</h1>
          <p className="text-gray-500">Libros, apuntes y materiales que compraste en la tienda</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border-2 border-dashed border-gray-200">
            <div className="text-6xl mb-4">🛍️</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Todavía no compraste nada</h3>
            <p className="text-gray-400 text-sm mb-5">Mirá los libros y materiales en la tienda.</p>
            <Link to="/courses#tienda" className="text-blue-600 hover:underline font-medium">Ir a la tienda →</Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {orders.map((o) => {
              const st = STATUS[o.status] || STATUS.pending;
              return (
                <div key={o.id} className="px-6 py-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl shrink-0">
                    {o.product_imagen && o.product_imagen.startsWith('http')
                      ? <img src={o.product_imagen} alt={o.product_nombre} className="w-full h-full object-cover" />
                      : (o.product_tipo === 'digital' ? '⬇' : '📦')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 truncate">{o.product_nombre}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatARS(Number(o.amount))} · {new Date(o.created_at).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  {o.status === 'paid' && o.product_tipo === 'digital' && (
                    <button
                      onClick={() => descargar(o.id)}
                      className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shrink-0"
                    >
                      ⬇ Descargar
                    </button>
                  )}
                  {o.status === 'paid' && o.product_tipo === 'fisico' && (
                    <span className="text-xs text-gray-400 shrink-0 text-right max-w-[140px]">Coordiná la entrega con la escuela</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MisCompras;
