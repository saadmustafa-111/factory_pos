import { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';
import { localizeApiText } from '../lib/localize';

export default function Settings() {
  const { t, isUrdu } = useLang();
  const [brands, setBrands] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [brandName, setBrandName] = useState('');
  const [brandSupplierId, setBrandSupplierId] = useState<number>(0);
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    phone: '',
    contact_person: '',
    address: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [message, setMessage] = useState('');

  const loadBrands = async () => {
    const [brandsRes, suppliersRes] = await Promise.all([
      api.get('/cement-brands'),
      api.get('/suppliers'),
    ]);
    setBrands(brandsRes.data);
    setSuppliers(suppliersRes.data);
  };

  useEffect(() => {
    loadBrands();
  }, []);

  const addBrand = async () => {
    if (!brandName.trim()) return;
    await api.post('/cement-brands', {
      brand_name: brandName,
      supplier_id: brandSupplierId || undefined,
    });
    setBrandName('');
    setBrandSupplierId(0);
    await loadBrands();
  };

  const removeBrand = async (id: number) => {
    await api.delete(`/cement-brands/${id}`);
    await loadBrands();
  };

  const addSupplier = async () => {
    if (!supplierForm.name.trim()) return;
    await api.post('/suppliers', supplierForm);
    setSupplierForm({ name: '', phone: '', contact_person: '', address: '' });
    await loadBrands();
  };

  const removeSupplier = async (id: number) => {
    await api.delete(`/suppliers/${id}`);
    await loadBrands();
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    try {
      await api.post('/auth/change-password', passwordForm);
      setMessage(t.passwordChanged);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch {
      setMessage(t.passwordChangeFailed);
    }
  };

  return (
    <div className={`space-y-6 ${isUrdu ? 'font-urdu' : ''}`}>
      <Card>
        <h2 className="mb-3 font-semibold">{t.brandManager}</h2>
        <div className="mb-3 flex gap-2">
          <Input placeholder={t.newBrand} value={brandName} onChange={(e) => setBrandName(e.target.value)} />
          <select
            value={brandSupplierId}
            onChange={(e) => setBrandSupplierId(Number(e.target.value))}
            className="h-10 rounded-md border border-slate-300 bg-white px-3"
          >
            <option value={0}>{t.linkSupplier}</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {localizeApiText(supplier.name, isUrdu)}
              </option>
            ))}
          </select>
          <Button onClick={addBrand}>{t.addBrand}</Button>
        </div>
        <div className="space-y-2">
          {brands.map((brand) => (
            <div key={brand.id} className="flex items-center justify-between rounded border border-slate-200 p-2">
              <span>
                {localizeApiText(brand.brand_name, isUrdu)}
                {brand.supplier?.name ? ` → ${localizeApiText(brand.supplier.name, isUrdu)}` : ''}
              </span>
              <Button variant="destructive" onClick={() => removeBrand(brand.id)}>
                {t.delete}
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">{t.suppliersManager}</h2>
        <div className="mb-3 grid gap-2 md:grid-cols-4">
          <Input
            placeholder={t.supplierName}
            value={supplierForm.name}
            onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
          />
          <Input
            placeholder={t.contactPerson}
            value={supplierForm.contact_person}
            onChange={(e) =>
              setSupplierForm({ ...supplierForm, contact_person: e.target.value })
            }
          />
          <Input
            placeholder={t.phone}
            value={supplierForm.phone}
            onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
          />
          <Input
            placeholder={t.address}
            value={supplierForm.address}
            onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
          />
        </div>
        <Button onClick={addSupplier} className="mb-3">
          {t.addSupplier}
        </Button>

        <div className="space-y-2">
          {suppliers.map((supplier) => (
            <div key={supplier.id} className="flex items-center justify-between rounded border border-slate-200 p-2">
              <span>{localizeApiText(supplier.name, isUrdu)}</span>
              <Button variant="destructive" onClick={() => removeSupplier(supplier.id)}>
                {t.delete}
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">{t.changePassword}</h2>
        <form className="space-y-3" onSubmit={changePassword}>
          <Input
            type="password"
            placeholder={t.currentPassword}
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
          />
          <Input
            type="password"
            placeholder={t.newPassword}
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
          />
          <Input
            type="password"
            placeholder={t.confirmPassword}
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
          />
          <Button type="submit">{t.changePassword}</Button>
        </form>
        {message && <p className="mt-2 text-sm text-slate-600">{message}</p>}
      </Card>
    </div>
  );
}
