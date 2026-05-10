import { useEffect, useState } from 'react';
import { Camera, CreditCard, MapPin, Phone, Upload, User, Loader2 } from 'lucide-react';
import { Modal } from './ui/modal';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { api } from '../lib/api';

interface SupplierFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editSupplier?: {
    id: number;
    name: string;
    phone?: string;
    address?: string;
    contact_person?: string;
    dealer_name?: string;
    business_name?: string;
    cnic?: string;
    image_url?: string;
  } | null;
}

export function SupplierFormModal({ open, onClose, onSuccess, editSupplier }: SupplierFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(editSupplier?.image_url || null);
  const [form, setForm] = useState({
    name: editSupplier?.name || '',
    dealer_name: editSupplier?.dealer_name || editSupplier?.contact_person || '',
    phone: editSupplier?.phone || '',
    address: editSupplier?.address || '',
    cnic: editSupplier?.cnic || '',
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      name: editSupplier?.name || '',
      dealer_name: editSupplier?.dealer_name || editSupplier?.contact_person || '',
      phone: editSupplier?.phone || '',
      address: editSupplier?.address || '',
      cnic: editSupplier?.cnic || '',
    });
    setImagePreview(editSupplier?.image_url || null);
    setError(null);
  }, [open, editSupplier]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        dealer_name: form.dealer_name || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        cnic: form.cnic || undefined,
        image_url: imagePreview || undefined,
      };
      if (editSupplier) {
        await api.patch(`/suppliers/${editSupplier.id}`, payload);
      } else {
        await api.post('/suppliers', payload);
      }
      onSuccess();
      onClose();
      setForm({ name: '', dealer_name: '', phone: '', address: '', cnic: '' });
      setImagePreview(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg || 'Failed to save supplier. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm({ name: '', dealer_name: '', phone: '', address: '', cnic: '' });
    setImagePreview(null);
    setError(null);
    onClose();
  };

  return (
    <Modal open={open} title={editSupplier ? 'Edit Dealer' : 'Add New Dealer'} onClose={handleClose}>
      <div className="space-y-5">

        {/* Photo */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-industrial-100 border-4 border-industrial-200 flex items-center justify-center overflow-hidden">
              {imagePreview ? (
                <img src={imagePreview} alt="Supplier" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-10 h-10 text-industrial-400" />
              )}
            </div>
            <label className="absolute bottom-0 right-0 bg-accent-primary text-white p-2 rounded-full cursor-pointer hover:bg-accent-primary/90 transition-colors shadow-lg">
              <Upload className="w-4 h-4" />
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
          </div>
          <p className="text-xs text-industrial-400 mt-2">Upload photo (optional)</p>
        </div>

        {/* Business Name */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-industrial-700">
            Business Name <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="e.g. Fauji Cement, Khan Steel Mill"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <p className="mt-1 text-xs text-industrial-400">The name of the company or shop you buy from.</p>
        </div>

        {/* Owner / Dealer Name */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-industrial-700">
            <User className="h-4 w-4 text-industrial-400" /> Owner / Dealer Name
          </label>
          <Input
            placeholder="e.g. Ahmed Khan"
            value={form.dealer_name}
            onChange={(e) => setForm({ ...form, dealer_name: e.target.value })}
          />
          <p className="mt-1 text-xs text-industrial-400">The person you deal with at this business.</p>
        </div>

        {/* Phone + CNIC */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-industrial-700">
              <Phone className="h-4 w-4 text-industrial-400" /> Phone
            </label>
            <Input
              placeholder="03xx-xxxxxxx"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-industrial-700">
              <CreditCard className="h-4 w-4 text-industrial-400" /> CNIC
            </label>
            <Input
              placeholder="xxxxx-xxxxxxx-x"
              value={form.cnic}
              onChange={(e) => setForm({ ...form, cnic: e.target.value })}
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-industrial-700">
            <MapPin className="h-4 w-4 text-industrial-400" /> Address
          </label>
          <Input
            placeholder="Shop / area / city"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-industrial-100 pt-4">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !form.name.trim()}>
            {loading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
            {editSupplier ? 'Save Changes' : 'Add Dealer'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}