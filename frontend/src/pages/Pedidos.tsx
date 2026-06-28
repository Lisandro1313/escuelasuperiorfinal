import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

interface SellerOrder {
  id: number;
  product_id: number;
  product_nombre: string;
  cantidad: number;
  amount: number;
  tipo: 'fisico' | 'digital';
  status: 'pending' | 'paid' | 'failed';
  created_at: string;
  user_nombre: string;
  user_email: string;
  user_telefono?: string | null;
  comprador_telefono?: string | null;
}

const formatARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

const STATUS: Record<string, { label: string; cls: string }> = {
  paid: { label: 'Pagado', cls: 'bg-green-100 text-green-700' },
  pending: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700' },
  failed: { label: 'Rechazado', cls: 'bg-red-100 text-red-700' },
};

const Pedidos: React.FC = () => {
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pagados' | 'todos'>('pagados');

  useEffect(() => {
    fetch('/api/orders', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setOrders(Array.isArray(d) ? d : []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  const visibles = useMemo(
    () => (filter === 'pagados' ? orders.filter((o) => o.status === 'paid') : orders),
    [orders, filter]
  );

  const waLink = (tel?: string | null) => {
    const digits = (tel || '').replace(/\D/g, '');
    return digits.length >= 8 ? `https://wa.me/${digits}` : null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Link to="/dashboard" className="text-sm text-blue-600 hover:underline">← Volver al panel</Link>
          <h1 className="text-3xl font-extrabold text-gray-900 mt-2 mb-1">Pedidos de la tienda</h1>
          <p className="text-gray-500">Compras de libros y materiales para coordinar la entrega</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1 w-fit mb-6">
          {(['pagados', 'todos'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition ${filter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              {f === 'pagados' ? 'Pagados' : 'Todos'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
          </div>
        ) : visibles.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border-2 border-dashed border-gray-200">
            <div className="text-6xl mb-4">🧾</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Sin pedidos {filter === 'pagados' ? 'pagados' : ''}</h3>
            <p className="text-gray-400 text-sm">Cuando alguien compre un producto online, va a aparecer acá.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-100">
                  <th className="px-5 py-3 font-medium">Producto</th>
                  <th className="px-5 py-3 font-medium">Comprador</th>
                  <th className="px-5 py-3 font-medium">Contacto</th>
                  <th className="px-5 py-3 font-medium">Monto</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                  <th className="px-5 py-3 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visibles.map((o) => {
                  const st = STATUS[o.status] || STATUS.pending;
                  const tel = o.comprador_telefono || o.user_telefono;
                  const wa = waLink(tel);
                  return (
                    <tr key={o.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-900">{o.product_nombre}</div>
                        <div className="text-xs text-gray-400">{o.tipo === 'digital' ? 'Digital' : 'Físico'}{o.cantidad > 1 ? ` · x${o.cantidad}` : ''}</div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-gray-900">{o.user_nombre}</div>
                        <div className="text-xs text-gray-400">{o.user_email}</div>
                      </td>
                      <td className="px-5 py-3">
                        {tel ? (
                          wa ? <a href={wa} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">💬 {tel}</a> : <span className="text-gray-600">{tel}</span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3 font-semibold text-gray-900">{formatARS(Number(o.amount))}</td>
                      <td className="px-5 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span></td>
                      <td className="px-5 py-3 text-gray-500">{new Date(o.created_at).toLocaleDateString('es-AR')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Pedidos;
