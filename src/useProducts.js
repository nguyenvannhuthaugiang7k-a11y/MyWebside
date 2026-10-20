import { useEffect, useState } from 'react';

export const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * Gọi GET /api/products và trả về { products, pagination, loading, error }.
 * Tự gọi lại mỗi khi search / category / sort / page thay đổi.
 */
export function useProducts({ search = '', category = '', sort = 'newest', page = 1, limit = 12 }) {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // AbortController: hủy request cũ khi người dùng gõ/lọc tiếp, tránh kết quả về sai thứ tự
    const controller = new AbortController();

    const params = new URLSearchParams({ page, limit, sort });
    if (search.trim()) params.set('search', search.trim());
    if (category) params.set('category', category);

    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API}/api/products?${params}`, { signal: controller.signal });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Không tải được sản phẩm');

        setProducts(json.data);          // mảng sản phẩm
        setPagination(json.pagination);  // { page, limit, total, totalPages }
      } catch (e) {
        if (e.name !== 'AbortError') setError(e.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [search, category, sort, page, limit]);

  return { products, pagination, loading, error };
}
