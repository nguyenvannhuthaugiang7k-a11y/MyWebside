import { useEffect, useState } from 'react';
import { API, useProducts } from './useProducts';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price_asc', label: 'Giá tăng dần' },
  { value: 'price_desc', label: 'Giá giảm dần' },
  { value: 'name', label: 'Tên A → Z' },
];

const formatPrice = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ---------- Thẻ sản phẩm ---------- */
function ProductCard({ product, onAdd }) {
  const outOfStock = product.stock <= 0;
  const lowStock = !outOfStock && product.stock <= 5;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-100 to-violet-200 text-5xl font-bold text-indigo-400">
            {product.name.charAt(0).toUpperCase()}
          </div>
        )}
        {product.categories && (
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-700 backdrop-blur">
            {product.categories.name}
          </span>
        )}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
            <span className="rounded-full bg-white px-4 py-1 text-sm font-semibold text-slate-800">Hết hàng</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-slate-800">{product.name}</h3>
        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{product.description}</p>

        <div className="mt-auto pt-4">
          <div className="flex items-end justify-between">
            <span className="text-lg font-bold text-indigo-600">{formatPrice(product.price)}</span>
            {lowStock && <span className="text-xs font-medium text-amber-600">Còn {product.stock}</span>}
          </div>
          <button
            onClick={() => onAdd(product)}
            disabled={outOfStock}
            className="mt-3 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Thêm vào giỏ
          </button>
        </div>
      </div>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="aspect-square bg-slate-200" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 rounded bg-slate-200" />
        <div className="h-3 w-full rounded bg-slate-200" />
        <div className="h-8 w-1/2 rounded bg-slate-200" />
      </div>
    </div>
  );
}

/* ---------- Trang chủ ----------
   Props:
   - getAccessToken: async () => string | null  (lấy JWT của Supabase khi đã đăng nhập)
*/
export default function Home({ getAccessToken }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  const [categories, setCategories] = useState([]);
  const [toast, setToast] = useState(null);

  const debouncedSearch = useDebounce(search);
  const { products, pagination, loading, error } = useProducts({
    search: debouncedSearch,
    category,
    sort,
    page,
  });

  // Danh mục (chạy 1 lần)
  useEffect(() => {
    fetch(`${API}/api/categories`)
      .then((r) => r.json())
      .then((json) => setCategories(json.data ?? []))
      .catch(() => {});
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2800);
  };

  async function handleAdd(product) {
    try {
      const token = await getAccessToken?.();
      if (!token) return showToast('Vui lòng đăng nhập để thêm vào giỏ hàng', 'error');

      const res = await fetch(`${API}/api/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ product_id: product.id, quantity: 1 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      showToast(`Đã thêm “${product.name}” vào giỏ`);
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  const resetFilters = () => {
    setSearch('');
    setCategory('');
    setSort('newest');
    setPage(1);
  };

  const hasFilter = search || category || sort !== 'newest';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Hero + tìm kiếm */}
      <header className="bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-4 pb-16 pt-10 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold tracking-tight">Shop<span className="text-amber-300">.</span></span>
          </div>
          <h1 className="mt-10 max-w-xl text-3xl font-extrabold leading-tight sm:text-5xl">
            Tìm món đồ bạn yêu thích
          </h1>
          <p className="mt-3 max-w-lg text-indigo-100">Hàng ngàn sản phẩm chính hãng, giao hàng nhanh chóng.</p>

          <div className="relative mt-8 max-w-2xl">
            <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Tìm kiếm sản phẩm..."
              className="w-full rounded-2xl border-0 bg-white py-4 pl-12 pr-4 text-slate-800 shadow-xl outline-none ring-2 ring-transparent placeholder:text-slate-400 focus:ring-amber-300"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto -mt-6 max-w-6xl px-4 pb-16">
        {/* Thanh bộ lọc */}
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-md sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
            {[{ slug: '', name: 'Tất cả' }, ...categories].map((c) => (
              <button
                key={c.slug}
                onClick={() => { setCategory(c.slug); setPage(1); }}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                  category === c.slug
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="sort" className="text-sm text-slate-500">Sắp xếp</label>
            <select
              id="sort"
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
          <span>{loading ? 'Đang tải...' : `${pagination.total} sản phẩm`}</span>
          {hasFilter && (
            <button onClick={resetFilters} className="font-medium text-indigo-600 hover:underline">
              Xóa bộ lọc
            </button>
          )}
        </div>

        {/* Lưới sản phẩm */}
        {error ? (
          <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-600">{error}</div>
        ) : loading ? (
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-lg font-semibold">Không tìm thấy sản phẩm phù hợp</p>
            <p className="mt-1 text-sm text-slate-500">Thử đổi từ khóa hoặc bỏ bớt bộ lọc.</p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => <ProductCard key={p.id} product={p} onAdd={handleAdd} />)}
          </div>
        )}

        {/* Phân trang */}
        {!loading && pagination.totalPages > 1 && (
          <nav className="mt-10 flex items-center justify-center gap-3">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium transition hover:bg-slate-100 disabled:opacity-40"
            >
              ← Trước
            </button>
            <span className="text-sm text-slate-600">Trang {pagination.page} / {pagination.totalPages}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= pagination.totalPages}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium transition hover:bg-slate-100 disabled:opacity-40"
            >
              Sau →
            </button>
          </nav>
        )}
      </main>

      {/* Thông báo */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-medium text-white shadow-lg ${
            toast.type === 'error' ? 'bg-red-600' : 'bg-slate-900'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
