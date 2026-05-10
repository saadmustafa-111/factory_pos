import { useEffect, useState } from 'react';
import { Camera, Car, CreditCard, Users, Upload, Loader2, Mail, Link2 } from 'lucide-react';
import { Modal } from './ui/modal';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { api } from '../lib/api';

interface CustomerFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editCustomer?: {
    id: number;
    name: string;
    phone: string;
    address: string;
    has_vehicle?: boolean;
    vehicle_number?: string;
    cnic?: string;
    relation_with_me?: string;
    image_url?: string;
    gmail?: string;
    facebook_link?: string;
    social_link?: string;
  } | null;
}

export function CustomerFormModal({ open, onClose, onSuccess, editCustomer }: CustomerFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(editCustomer?.image_url || null);
  const [form, setForm] = useState({
    name: editCustomer?.name || '',
    phone: editCustomer?.phone || '',
    address: editCustomer?.address || '',
    has_vehicle: editCustomer?.has_vehicle || false,
    vehicle_number: editCustomer?.vehicle_number || '',
    cnic: editCustomer?.cnic || '',
    relation_with_me: editCustomer?.relation_with_me || '',
    gmail: editCustomer?.gmail || '',
    facebook_link: editCustomer?.facebook_link || '',
    social_link: editCustomer?.social_link || '',
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      name: editCustomer?.name || '',
      phone: editCustomer?.phone || '',
      address: editCustomer?.address || '',
      has_vehicle: editCustomer?.has_vehicle || false,
      vehicle_number: editCustomer?.vehicle_number || '',
      cnic: editCustomer?.cnic || '',
      relation_with_me: editCustomer?.relation_with_me || '',
      gmail: editCustomer?.gmail || '',
      facebook_link: editCustomer?.facebook_link || '',
      social_link: editCustomer?.social_link || '',
    });
    setImagePreview(editCustomer?.image_url || null);
  }, [open, editCustomer]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const payload = {
        ...form,
        image_url: imagePreview || undefined,
      };
      
      if (editCustomer) {
        await api.patch(`/customers/${editCustomer.id}`, payload);
      } else {
        await api.post('/customers', payload);
      }
      onSuccess();
      onClose();
      // Reset form
      setForm({
        name: '',
        phone: '',
        address: '',
        has_vehicle: false,
        vehicle_number: '',
        cnic: '',
        relation_with_me: '',
        gmail: '',
        facebook_link: '',
        social_link: '',
      });
      setImagePreview(null);
    } catch (err) {
      console.error('Failed to save customer:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm({
      name: '',
      phone: '',
      address: '',
      has_vehicle: false,
      vehicle_number: '',
      cnic: '',
      relation_with_me: '',
      gmail: '',
      facebook_link: '',
      social_link: '',        is_dealer: false,    });
    setImagePreview(null);
    onClose();
  };

  return (
    <Modal open={open} title={editCustomer ? 'Edit Customer' : 'Add New Customer'} onClose={handleClose}>
      <div className="space-y-6">
        {/* Profile Image Section */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-industrial-100 border-4 border-industrial-200 flex items-center justify-center overflow-hidden">
              {imagePreview ? (
                <img src={imagePreview} alt="Customer" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-10 h-10 text-industrial-400" />
              )}
            </div>
            <label className="absolute bottom-0 right-0 bg-accent-primary text-white p-2 rounded-full cursor-pointer hover:bg-accent-primary/90 transition-colors shadow-lg">
              <Upload className="w-4 h-4" />
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
          </div>
          <p className="text-xs text-industrial-500 mt-2">Upload customer photo</p>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-industrial-700">
              Name <span className="text-accent-danger">*</span>
            </label>
            <Input 
              placeholder="Enter customer name" 
              value={form.name} 
              onChange={(e) => setForm({ ...form, name: e.target.value })} 
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-industrial-700">
              Phone Number
            </label>
            <Input 
              placeholder="03xx-xxxxxxx" 
              value={form.phone} 
              onChange={(e) => setForm({ ...form, phone: e.target.value })} 
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-industrial-700">
              Address
            </label>
            <Input 
              placeholder="Enter address" 
              value={form.address} 
              onChange={(e) => setForm({ ...form, address: e.target.value })} 
            />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-industrial-200 pt-4">
          <h4 className="text-sm font-semibold text-industrial-700 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Additional Details
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Has Vehicle Toggle */}
            <div className="md:col-span-2">
              <label className="mb-2 text-sm font-medium text-industrial-600 flex items-center gap-1">
                <Car className="w-4 h-4" />
                Has Vehicle?
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, has_vehicle: true, vehicle_number: form.has_vehicle ? form.vehicle_number : '' })}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${form.has_vehicle ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-industrial-300 text-industrial-500 hover:border-green-400'}`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, has_vehicle: false, vehicle_number: '' })}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${!form.has_vehicle ? 'bg-industrial-700 border-industrial-700 text-white' : 'bg-white border-industrial-300 text-industrial-500 hover:border-industrial-400'}`}
                >
                  No
                </button>
              </div>
            </div>

            {/* Vehicle Number — shown only if has_vehicle */}
            {form.has_vehicle && (
              <div className="md:col-span-2">
                <label className="mb-2 text-sm font-medium text-industrial-600 flex items-center gap-1">
                  <Car className="w-4 h-4" />
                  Vehicle Number / Details
                </label>
                <Input
                  placeholder="e.g. ABC-123, Toyota Corolla"
                  value={form.vehicle_number}
                  onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })}
                />
              </div>
            )}

            {/* CNIC */}
            <div>
              <label className="mb-2 text-sm font-medium text-industrial-600 flex items-center gap-1">
                <CreditCard className="w-4 h-4" />
                CNIC Number
              </label>
              <Input 
                placeholder="xxxxx-xxxxxxx-x" 
                value={form.cnic} 
                onChange={(e) => setForm({ ...form, cnic: e.target.value })} 
              />
            </div>

            {/* Relation with Me */}
            <div className="md:col-span-2">
              <label className="mb-2 text-sm font-medium text-industrial-600 flex items-center gap-1">
                <Users className="w-4 h-4" />
                Relation with Me
              </label>
              <Input 
                placeholder="e.g., Friend, Relative, Dealer, etc." 
                value={form.relation_with_me} 
                onChange={(e) => setForm({ ...form, relation_with_me: e.target.value })} 
              />
            </div>

            <div>
              <label className="mb-2 text-sm font-medium text-industrial-600 flex items-center gap-1">
                <Mail className="w-4 h-4" />
                Gmail
              </label>
              <Input
                placeholder="name@gmail.com"
                value={form.gmail}
                onChange={(e) => setForm({ ...form, gmail: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-2 text-sm font-medium text-industrial-600 flex items-center gap-1">
                <Link2 className="w-4 h-4" />
                Facebook Link
              </label>
              <Input
                placeholder="https://facebook.com/..."
                value={form.facebook_link}
                onChange={(e) => setForm({ ...form, facebook_link: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 text-sm font-medium text-industrial-600 flex items-center gap-1">
                <Link2 className="w-4 h-4" />
                Other Social Link
              </label>
              <Input
                placeholder="Instagram / WhatsApp / other profile link"
                value={form.social_link}
                onChange={(e) => setForm({ ...form, social_link: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !form.name.trim()}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {editCustomer ? 'Update Customer' : 'Add Customer'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}