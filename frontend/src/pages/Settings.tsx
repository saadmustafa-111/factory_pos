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
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', address: '' });
  const [message, setMessage] = useState('');

  // Recovery PIN
  const [hasPin, setHasPin] = useState(false);
  const [pinForm, setPinForm] = useState({ currentPassword: '', recoveryPin: '', confirmPin: '' });
  const [pinMessage, setPinMessage] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  const loadPinStatus = async () => {
    try {
      const { data } = await api.get('/auth/recovery-pin-status');
      setHasPin(data.hasPin);
    } catch { /* ignore */ }
  };

  const saveRecoveryPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinMessage('');
    if (!pinForm.recoveryPin.trim()) { setPinMessage('Please enter a PIN'); return; }
    if (pinForm.recoveryPin !== pinForm.confirmPin) { setPinMessage('PINs do not match'); return; }
    setPinLoading(true);
    try {
      await api.post('/auth/set-recovery-pin', {
        currentPassword: pinForm.currentPassword,
        recoveryPin: pinForm.recoveryPin,
      });
      setPinMessage('Recovery PIN saved successfully!');
      setPinForm({ currentPassword: '', recoveryPin: '', confirmPin: '' });
      setHasPin(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setPinMessage(typeof msg === 'string' ? msg : 'Failed to save PIN');
    } finally {
      setPinLoading(false);
    }
  };

  const loadAll = async () => {
    const [brandsRes, suppliersRes, customersRes] = await Promise.all([
      api.get('/cement-brands'),
      api.get('/suppliers'),
      api.get('/customers'),
    ]);
    setBrands(brandsRes.data);
    setSuppliers(suppliersRes.data);
    setCustomers(customersRes.data);
  };

  const loadBrands = loadAll;

  useEffect(() => {
    loadAll();
    loadPinStatus();
  }, []);

  const addCustomer = async () => {
    if (!customerForm.name.trim()) return;
    await api.post('/customers', customerForm);
    setCustomerForm({ name: '', phone: '', address: '' });
    await loadAll();
  };

  const removeCustomer = async (id: number) => {
    await api.delete(`/customers/${id}`);
    await loadAll();
  };

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
    <div className={`space-y-8 ${isUrdu ? 'font-urdu' : ''}`}>

      {/* Customer Manager */}
      <Card>
        <div className="border-b border-industrial-200 px-6 py-5 bg-industrial-50">
          <h2 className="text-xl font-bold text-industrial-900">Customer Manager</h2>
          <p className="text-sm text-industrial-500 mt-1">Add and manage your customers. These appear in the Sales page dropdown.</p>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-48">
              <label className="mb-2 block text-sm font-semibold text-industrial-700">Name <span className="text-accent-danger">*</span></label>
              <Input placeholder="Customer name" value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} />
            </div>
            <div className="flex-1 min-w-40">
              <label className="mb-2 block text-sm font-semibold text-industrial-700">Phone</label>
              <Input placeholder="Phone number" value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} />
            </div>
            <div className="flex-1 min-w-48">
              <label className="mb-2 block text-sm font-semibold text-industrial-700">Address</label>
              <Input placeholder="Address (optional)" value={customerForm.address} onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })} />
            </div>
            <Button onClick={addCustomer} className="h-11" disabled={!customerForm.name.trim()}>Add Customer</Button>
          </div>

          <div className="divide-y divide-industrial-200 rounded-xl border-2 border-industrial-200 overflow-hidden">
            {customers.length === 0 ? (
              <p className="px-6 py-8 text-center text-industrial-500 font-medium">No customers yet. Add your first customer above.</p>
            ) : customers.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-5 py-4 hover:bg-industrial-50">
                <div>
                  <p className="font-bold text-industrial-900">{localizeApiText(c.name, isUrdu)}</p>
                  <p className="text-sm text-industrial-500">{[c.phone, c.address].filter(Boolean).join(' · ') || 'No contact info'}</p>
                </div>
                <Button variant="destructive" size="sm" onClick={() => removeCustomer(c.id)}>Delete</Button>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <div className="border-b border-industrial-200 px-6 py-5 bg-industrial-50">
          <h2 className="text-xl font-bold text-industrial-900">{t.brandManager}</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-64">
              <label className="mb-2 block text-sm font-semibold text-industrial-700">{t.newBrand}</label>
              <Input placeholder={t.newBrand} value={brandName} onChange={(e) => setBrandName(e.target.value)} />
            </div>
            <div className="flex-1 min-w-64">
              <label className="mb-2 block text-sm font-semibold text-industrial-700">{t.linkSupplier}</label>
              <select
                value={brandSupplierId}
                onChange={(e) => setBrandSupplierId(Number(e.target.value))}
                className="h-11 w-full rounded-lg border-2 border-industrial-300 bg-white px-4 text-sm font-medium focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
              >
                <option value={0}>{t.linkSupplier}</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {localizeApiText(supplier.name, isUrdu)}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={addBrand} className="h-11">
              {t.addBrand}
            </Button>
          </div>

          <div className="space-y-3">
            {brands.map((brand) => (
              <div key={brand.id} className="flex items-center justify-between rounded-xl border-2 border-industrial-200 p-4 hover:bg-industrial-50 transition-colors">
                <span className="font-semibold text-industrial-900">
                  {localizeApiText(brand.brand_name, isUrdu)}
                  {brand.supplier?.name ? <span className="text-industrial-500 ml-2">→ {localizeApiText(brand.supplier.name, isUrdu)}</span> : ''}
                </span>
                <Button variant="destructive" onClick={() => removeBrand(brand.id)} size="sm">
                  {t.delete}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <div className="border-b border-industrial-200 px-6 py-5 bg-industrial-50">
          <h2 className="text-xl font-bold text-industrial-900">{t.suppliersManager}</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-industrial-700">{t.supplierName}</label>
              <Input
                placeholder={t.supplierName}
                value={supplierForm.name}
                onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-industrial-700">{t.contactPerson}</label>
              <Input
                placeholder={t.contactPerson}
                value={supplierForm.contact_person}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, contact_person: e.target.value })
                }
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-industrial-700">{t.phone}</label>
              <Input
                placeholder={t.phone}
                value={supplierForm.phone}
                onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-industrial-700">{t.address}</label>
              <Input
                placeholder={t.address}
                value={supplierForm.address}
                onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
              />
            </div>
          </div>
          <Button onClick={addSupplier}>
            {t.addSupplier}
          </Button>

          <div className="space-y-3">
            {suppliers.map((supplier) => (
              <div key={supplier.id} className="flex items-center justify-between rounded-xl border-2 border-industrial-200 p-4 hover:bg-industrial-50 transition-colors">
                <div>
                  <span className="font-semibold text-industrial-900">{localizeApiText(supplier.name, isUrdu)}</span>
                  {supplier.contact_person && <span className="text-industrial-500 ml-2">({supplier.contact_person})</span>}
                  {supplier.phone && <span className="text-industrial-500 ml-2">• {supplier.phone}</span>}
                </div>
                <Button variant="destructive" onClick={() => removeSupplier(supplier.id)} size="sm">
                  {t.delete}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <div className="border-b border-industrial-200 px-6 py-5 bg-industrial-50">
          <h2 className="text-xl font-bold text-industrial-900">{t.changePassword}</h2>
        </div>
        <div className="p-6">
          <form className="space-y-4" onSubmit={changePassword}>
            <div>
              <label className="mb-2 block text-sm font-semibold text-industrial-700">{t.currentPassword}</label>
              <Input
                type="password"
                placeholder={t.currentPassword}
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-industrial-700">{t.newPassword}</label>
              <Input
                type="password"
                placeholder={t.newPassword}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-industrial-700">{t.confirmPassword}</label>
              <Input
                type="password"
                placeholder={t.confirmPassword}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              />
            </div>
            <Button type="submit" className="mt-4">
              {t.changePassword}
            </Button>
          </form>
          {message && <p className={`mt-4 text-sm font-semibold ${message === t.passwordChanged ? 'text-green-600' : 'text-accent-danger'}`}>{message}</p>}
        </div>
      </Card>

      {/* Recovery PIN */}
      <Card>
        <div className="border-b border-industrial-200 px-6 py-5 bg-amber-50">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-industrial-900">Recovery PIN</h2>
              <p className="text-sm text-industrial-500">Used to reset your password if you ever forget it</p>
            </div>
            <div className="ml-auto">
              {hasPin
                ? <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700"><span className="h-2 w-2 rounded-full bg-green-500 inline-block" />PIN Set</span>
                : <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700"><span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />Default (1234)</span>
              }
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="mb-5 rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <strong>How it works:</strong> If you forget your login password, click <em>"Forgot Password?"</em> on the login screen and enter this PIN to reset it. The default PIN is <strong>1234</strong> — change it to something only you know.
          </div>
          <form className="space-y-4" onSubmit={saveRecoveryPin}>
            <div>
              <label className="mb-2 block text-sm font-semibold text-industrial-700">Current Password (to confirm it's you)</label>
              <Input
                type="password"
                placeholder="Enter your current login password"
                value={pinForm.currentPassword}
                onChange={(e) => setPinForm({ ...pinForm, currentPassword: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-industrial-700">New Recovery PIN</label>
                <Input
                  type="password"
                  inputMode="numeric"
                  placeholder="e.g. 5678"
                  value={pinForm.recoveryPin}
                  onChange={(e) => setPinForm({ ...pinForm, recoveryPin: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-industrial-700">Confirm PIN</label>
                <Input
                  type="password"
                  inputMode="numeric"
                  placeholder="Repeat PIN"
                  value={pinForm.confirmPin}
                  onChange={(e) => setPinForm({ ...pinForm, confirmPin: e.target.value })}
                />
              </div>
            </div>
            <Button type="submit" disabled={pinLoading} className="mt-2">
              {pinLoading ? 'Saving...' : (hasPin ? 'Update Recovery PIN' : 'Set Recovery PIN')}
            </Button>
          </form>
          {pinMessage && (
            <p className={`mt-4 text-sm font-semibold ${pinMessage.includes('success') ? 'text-green-600' : 'text-accent-danger'}`}>
              {pinMessage}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
