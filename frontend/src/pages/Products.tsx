import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';
import { localizeApiText } from '../lib/localize';
import { ManagedOptionsModal, type ManagedOption } from '../components/ManagedOptionsModal';

interface Product {
  id: number;
  name: string;
  category: string;
  type: string;
  unit: string;
  discount: number;
  is_active: boolean;
}

interface CementBrand {
  id: number;
  brand_name: string;
  supplier_id?: number;
  supplier?: { id: number; name: string };
}

interface Supplier {
  id: number;
  name: string;
}

const emptyProduct = { name: '', category: 'sariya', type: 'standard', unit: 'kg', discount: 0 };
const emptyBrand = { brand_name: '', supplier_id: 0 };

export default function ProductsPage() {
  const { isUrdu } = useLang();
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<CementBrand[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Product form/modal state
  const [productModal, setProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({ ...emptyProduct });
  const [productSaving, setProductSaving] = useState(false);
  const [productError, setProductError] = useState('');
  const [categoryOptions, setCategoryOptions] = useState<ManagedOption[]>([]);
  const [typeOptions, setTypeOptions] = useState<ManagedOption[]>([]);
  const [unitOptions, setUnitOptions] = useState<ManagedOption[]>([]);
  const [optionsModal, setOptionsModal] = useState<null | 'product_category' | 'product_type' | 'product_unit'>(null);

  // Brand form state
  const [brandModal, setBrandModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<CementBrand | null>(null);
  const [brandForm, setBrandForm] = useState({ ...emptyBrand });
  const [brandSaving, setBrandSaving] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [prodRes, brandRes, suppRes] = await Promise.all([
        api.get<Product[]>('/products'),
        api.get<CementBrand[]>('/cement-brands'),
        api.get<Supplier[]>('/suppliers'),
      ]);
      setProducts(prodRes.data);
      setBrands(brandRes.data);
      setSuppliers(suppRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const loadProductOptions = async () => {
    const [categoriesRes, typesRes, unitsRes] = await Promise.all([
      api.get<ManagedOption[]>('/options/product_category'),
      api.get<ManagedOption[]>('/options/product_type'),
      api.get<ManagedOption[]>('/options/product_unit'),
    ]);
    setCategoryOptions(categoriesRes.data);
    setTypeOptions(typesRes.data);
    setUnitOptions(unitsRes.data);
  };

  useEffect(() => {
    void loadProductOptions();
  }, []);

  // -------- Product handlers --------
  const openAddProduct = () => {
    setEditingProduct(null);
    setProductError('');
    setProductForm({
      ...emptyProduct,
      category: categoryOptions[0]?.name || emptyProduct.category,
      type: typeOptions[0]?.name || emptyProduct.type,
      unit: unitOptions[0]?.name || emptyProduct.unit,
    });
    setProductModal(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProductError('');
    setProductForm({ name: p.name, category: p.category, type: p.type, unit: p.unit, discount: p.discount ?? 0 });
    setProductModal(true);
  };

  const saveProduct = async () => {
    if (!productForm.name.trim()) return;
    setProductSaving(true);
    setProductError('');
    try {
      if (editingProduct) {
        await api.patch(`/products/${editingProduct.id}`, productForm);
      } else {
        await api.post('/products', productForm);
      }
      setProductModal(false);
      await loadAll();
    } catch (err: any) {
      setProductError(err?.response?.data?.message || 'Failed to save product');
    } finally {
      setProductSaving(false);
    }
  };

  const deleteProduct = async (id: number) => {
    if (!window.confirm('Delete this product?')) return;
    await api.delete(`/products/${id}`);
    await loadAll();
  };

  // -------- Brand handlers --------
  const openAddBrand = () => {
    setEditingBrand(null);
    setBrandForm({ ...emptyBrand });
    setBrandModal(true);
  };

  const openEditBrand = (b: CementBrand) => {
    setEditingBrand(b);
    setBrandForm({ brand_name: b.brand_name, supplier_id: b.supplier_id ?? 0 });
    setBrandModal(true);
  };

  const saveBrand = async () => {
    if (!brandForm.brand_name.trim()) return;
    setBrandSaving(true);
    try {
      const payload = {
        brand_name: brandForm.brand_name,
        supplier_id: brandForm.supplier_id || undefined,
      };
      if (editingBrand) {
        await api.patch(`/cement-brands/${editingBrand.id}`, payload);
      } else {
        await api.post('/cement-brands', payload);
      }
      setBrandModal(false);
      await loadAll();
    } finally {
      setBrandSaving(false);
    }
  };

  const deleteBrand = async (id: number) => {
    if (!window.confirm('Delete this cement brand?')) return;
    await api.delete(`/cement-brands/${id}`);
    await loadAll();
  };

  const categoryLabel = (cat: string) => cat;

  const categoryColor = (cat: string) => {
    const map: Record<string, string> = {
      sariya: 'bg-blue-100 text-blue-700',
      rings: 'bg-purple-100 text-purple-700',
      wire: 'bg-yellow-100 text-yellow-700',
      cement: 'bg-orange-100 text-orange-700',
    };
    return map[cat] ?? 'bg-industrial-100 text-industrial-600';
  };

  return (
    <div className={`flex min-h-0 flex-col gap-3 ${isUrdu ? 'font-urdu' : ''}`}>
      {/* ── Products Table ── */}
      <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-industrial-900">Products</h1>
            <p className="text-sm text-industrial-500 mt-0.5">Manage products available in the POS (used in Sales and Stock In).</p>
          </div>
          <button
            onClick={openAddProduct}
            className="flex items-center gap-2 rounded-xl bg-accent-primary px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-accent-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Product
          </button>
      </div>

      <div className="flex-1 flex flex-col rounded-xl border-2 border-industrial-200 bg-white overflow-hidden min-h-0">
        <div className="flex-1 overflow-auto">
        {loading ? (
          <p className="py-10 text-center text-industrial-500">Loading…</p>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Tag className="h-12 w-12 text-industrial-300 mb-3" />
            <p className="font-semibold text-industrial-500">No products yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
              <thead className="sticky top-0 bg-industrial-800 text-white z-10">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Name</th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Category</th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Type</th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Unit</th>
                  <th className="px-5 py-3.5 text-center text-xs font-bold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-industrial-50 transition-colors">
                    <td className="px-5 py-4 font-semibold text-industrial-900">
                      {localizeApiText(p.name, isUrdu)}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${categoryColor(p.category)}`}>
                        {categoryLabel(p.category)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-industrial-600">{p.type || '—'}</td>
                    <td className="px-5 py-4 text-industrial-600 uppercase text-xs font-semibold">{p.unit}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditProduct(p)}
                          className="rounded-lg border border-industrial-200 p-2 text-industrial-500 hover:bg-industrial-100 hover:text-industrial-800 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteProduct(p.id)}
                          className="rounded-lg border border-red-200 p-2 text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
          </table>
        )}
        </div>
      </div>

      {/* ── Cement Brands ── */}
      <div className="shrink-0 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-industrial-900">Cement Brands</h2>
            <p className="text-sm text-industrial-500 mt-0.5">Brands available when stocking cement products.</p>
          </div>
          <button
            onClick={openAddBrand}
            className="flex items-center gap-2 rounded-xl bg-accent-primary px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-accent-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Brand
          </button>
      </div>

      <div className="flex-1 flex flex-col rounded-xl border-2 border-industrial-200 bg-white overflow-hidden min-h-0">
        <div className="flex-1 overflow-auto">
        {brands.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-industrial-400 text-sm">
            No cement brands yet. Add a brand above.
          </div>
        ) : (
          <table className="w-full text-sm">
              <thead className="sticky top-0 bg-industrial-800 text-white z-10">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Brand Name</th>
                  <th className="px-5 py-3.5 text-center text-xs font-bold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-100">
                {brands.map((b) => (
                  <tr key={b.id} className="hover:bg-industrial-50 transition-colors">
                    <td className="px-5 py-4 font-semibold text-industrial-900">
                      {localizeApiText(b.brand_name, isUrdu)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditBrand(b)}
                          className="rounded-lg border border-industrial-200 p-2 text-industrial-500 hover:bg-industrial-100 hover:text-industrial-800 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteBrand(b.id)}
                          className="rounded-lg border border-red-200 p-2 text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
          </table>
        )}
        </div>
      </div>

      {/* ── Product Modal ── */}
      {productModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-industrial-200 px-6 py-4">
              <h3 className="text-lg font-bold text-industrial-900">{editingProduct ? 'Edit Product' : 'Add Product'}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-industrial-700">Name</label>
                <input
                  type="text"
                  placeholder="Product name"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full rounded-lg border border-industrial-200 px-3 py-2 text-sm focus:border-industrial-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-industrial-700">Category</label>
                <select
                  value={productForm.category}
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  className="w-full rounded-lg border border-industrial-200 px-3 py-2 text-sm focus:border-industrial-500 focus:outline-none"
                >
                  {categoryOptions.map((c) => (
                    <option key={c.id} value={c.name}>{categoryLabel(c.name)}</option>
                  ))}
                </select>
                <button type="button" onClick={() => setOptionsModal('product_category')} className="mt-1 text-xs font-semibold text-accent-primary">
                  Manage categories
                </button>
              </div>
              {productForm.category === 'cement' && (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-industrial-700">Cement Brand</label>
                  <select
                    value={productForm.type}
                    onChange={(e) => setProductForm({ ...productForm, type: e.target.value })}
                    className="w-full rounded-lg border border-industrial-200 px-3 py-2 text-sm focus:border-industrial-500 focus:outline-none"
                  >
                    <option value="standard">— No specific brand —</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.brand_name}>{b.brand_name}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-industrial-400">Manage cement brands in the section below.</p>
                </div>
              )}
              {productForm.category !== 'cement' && (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-industrial-700">Type / Gauge</label>
                  <select
                    value={productForm.type}
                    onChange={(e) => setProductForm({ ...productForm, type: e.target.value })}
                    className="w-full rounded-lg border border-industrial-200 px-3 py-2 text-sm focus:border-industrial-500 focus:outline-none"
                  >
                    {typeOptions.map((type) => (
                      <option key={type.id} value={type.name}>{type.name}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setOptionsModal('product_type')} className="mt-1 text-xs font-semibold text-accent-primary">
                    Manage types
                  </button>
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-industrial-700">Unit</label>
                <select
                  value={productForm.unit}
                  onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                  className="w-full rounded-lg border border-industrial-200 px-3 py-2 text-sm focus:border-industrial-500 focus:outline-none"
                >
                  {unitOptions.map((u) => (
                    <option key={u.id} value={u.name}>{u.name}</option>
                  ))}
                </select>
                <button type="button" onClick={() => setOptionsModal('product_unit')} className="mt-1 text-xs font-semibold text-accent-primary">
                  Manage units
                </button>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-industrial-700">Discount (Rs per unit)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={productForm.discount}
                  onChange={(e) => setProductForm({ ...productForm, discount: Number(e.target.value) })}
                  className="w-full rounded-lg border border-industrial-200 px-3 py-2 text-sm focus:border-industrial-500 focus:outline-none"
                />
                <p className="mt-1 text-xs text-industrial-400">Default discount shown when this product is sold.</p>
              </div>
              {productError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {productError}
                </div>
              ) : null}
            </div>
            <div className="flex justify-end gap-3 border-t border-industrial-200 px-6 py-4">
              <button
                onClick={() => setProductModal(false)}
                className="rounded-lg border border-industrial-200 px-4 py-2 text-sm font-medium text-industrial-600 hover:bg-industrial-50"
              >
                Cancel
              </button>
              <button
                onClick={saveProduct}
                disabled={productSaving || !productForm.name.trim()}
                className="rounded-lg bg-accent-primary px-5 py-2 text-sm font-bold text-white hover:bg-accent-primary/90 disabled:opacity-50"
              >
                {productSaving ? 'Saving…' : (editingProduct ? 'Save Changes' : 'Add Product')}
              </button>
            </div>
          </div>
        </div>
      )}
      {optionsModal ? (
        <ManagedOptionsModal
          open
          scope={optionsModal}
          title={
            optionsModal === 'product_category'
              ? 'Manage Categories'
              : optionsModal === 'product_type'
                ? 'Manage Types'
                : 'Manage Units'
          }
          createLabel="Enter a name"
          onClose={() => setOptionsModal(null)}
          onChanged={async () => {
            await loadProductOptions();
            await loadAll();
          }}
        />
      ) : null}

      {/* ── Brand Modal ── */}
      {brandModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-industrial-200 px-6 py-4">
              <h3 className="text-lg font-bold text-industrial-900">{editingBrand ? 'Edit Cement Brand' : 'Add Cement Brand'}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-industrial-700">Brand Name</label>
                <input
                  type="text"
                  placeholder="e.g. DG Khan, Lucky, Maple Leaf"
                  value={brandForm.brand_name}
                  onChange={(e) => setBrandForm({ ...brandForm, brand_name: e.target.value })}
                  className="w-full rounded-lg border border-industrial-200 px-3 py-2 text-sm focus:border-industrial-500 focus:outline-none"
                />
              </div>
              <div>
                    <label className="mb-1.5 block text-sm font-semibold text-industrial-700">Link Dealer (optional)</label>
                <select
                  value={brandForm.supplier_id}
                  onChange={(e) => setBrandForm({ ...brandForm, supplier_id: Number(e.target.value) })}
                  className="w-full rounded-lg border border-industrial-200 px-3 py-2 text-sm focus:border-industrial-500 focus:outline-none"
                >
                  <option value={0}>— No supplier —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-industrial-200 px-6 py-4">
              <button
                onClick={() => setBrandModal(false)}
                className="rounded-lg border border-industrial-200 px-4 py-2 text-sm font-medium text-industrial-600 hover:bg-industrial-50"
              >
                Cancel
              </button>
              <button
                onClick={saveBrand}
                disabled={brandSaving || !brandForm.brand_name.trim()}
                className="rounded-lg bg-accent-primary px-5 py-2 text-sm font-bold text-white hover:bg-accent-primary/90 disabled:opacity-50"
              >
                {brandSaving ? 'Saving…' : (editingBrand ? 'Save Changes' : 'Add Brand')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
