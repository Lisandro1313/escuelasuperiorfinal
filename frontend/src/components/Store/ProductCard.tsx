import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export interface Product {
  id: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  imagen?: string | null;
  tipo: 'fisico' | 'digital';
  archivo_url?: string | null;
  stock?: number | null;
  whatsapp?: string | null;
  permite_pago_online?: boolean | number;
  permite_whatsapp?: boolean | number;
  profesor?: string;
}

const formatARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

const STORE_PLACEHOLDERS = [
  'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=260&fit=crop', // libros
  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&h=260&fit=crop', // libros 2
  'https://images.unsplash.com/photo-1535905557558-afc4877a26fc?w=400&h=260&fit=crop', // apuntes
  'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=260&fit=crop', // libreria
];

const ProductCard: React.FC<{ product: Product; idx: number }> = ({ product, idx }) => {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [buying, setBuying] = useState(false);
  const [err, setErr] = useState('');

  const precio = Number(product.precio || 0);
  const onlineDisponible = product.permite_pago_online !== false && product.permite_pago_online !== 0 && precio > 0;
  const waDigits = (product.whatsapp || '').replace(/\D/g, '');
  const whatsappDisponible = (product.permite_whatsapp !== false && product.permite_whatsapp !== 0) && waDigits.length >= 8;
  const isDigital = product.tipo === 'digital';
  const sinStock = product.stock != null && Number(product.stock) <= 0;

  const img = product.imagen && product.imagen.startsWith('http')
    ? product.imagen
    : STORE_PLACEHOLDERS[idx % STORE_PLACEHOLDERS.length];

  const comprarOnline = async () => {
    if (!usuario) { navigate('/login'); return; }
    setBuying(true);
    setErr('');
    try {
      const res = await fetch(`/api/products/${product.id}/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ cantidad: 1 }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'No se pudo iniciar la compra');
      const url = d.initPoint || d.sandboxInitPoint;
      if (url) window.location.href = url;
      else throw new Error('No se recibió el link de pago');
    } catch (e: any) {
      setErr(e.message);
      setBuying(false);
    }
  };

  const whatsappUrl = () => {
    const quien = usuario?.nombre ? ` Soy ${usuario.nombre}.` : '';
    const msg = `¡Hola! Quiero consultar por *${product.nombre}* (${formatARS(precio)}).${quien}`;
    return `https://wa.me/${waDigits}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl shadow-sm transition-all duration-300 flex flex-col">
      {/* Imagen */}
      <div className="relative h-44 overflow-hidden bg-gray-100 shrink-0">
        <img
          src={img}
          alt={product.nombre}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => { (e.target as HTMLImageElement).src = STORE_PLACEHOLDERS[idx % STORE_PLACEHOLDERS.length]; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <div className="absolute top-3 right-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${isDigital ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
            {isDigital ? '⬇ Digital' : '📦 Físico'}
          </span>
        </div>
        {sinStock && (
          <div className="absolute top-3 left-3 bg-gray-800 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
            Sin stock
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-bold text-gray-900 mb-1 line-clamp-2">{product.nombre}</h3>
        {product.profesor && <p className="text-xs text-gray-400 mb-2 font-medium">por {product.profesor}</p>}
        {product.descripcion && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1 leading-relaxed">{product.descripcion}</p>
        )}

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
          <span className={`font-bold text-base ${precio === 0 ? 'text-green-600' : 'text-gray-900'}`}>
            {precio === 0 ? 'A consultar' : formatARS(precio)}
          </span>
        </div>

        {err && <p className="text-red-500 text-xs bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-lg mt-3">{err}</p>}

        {/* Acciones */}
        <div className="mt-4 flex flex-col gap-2">
          {onlineDisponible && (
            <button
              onClick={comprarOnline}
              disabled={buying || sinStock}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold px-4 py-2.5 rounded-xl transition text-sm"
            >
              {buying ? 'Redirigiendo…' : '🛒 Comprar online'}
            </button>
          )}
          {whatsappDisponible && (
            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-center bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2.5 rounded-xl transition text-sm"
            >
              💬 Consultar por WhatsApp
            </a>
          )}
          {!onlineDisponible && !whatsappDisponible && (
            <p className="text-xs text-gray-400 text-center py-2">Consultá con la escuela por este producto.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
