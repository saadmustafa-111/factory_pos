import { Building2, CreditCard, MapPin, Pencil, Phone, ShoppingCart, Truck, User, X, ZoomIn } from 'lucide-react';
import { useState } from 'react';

interface Supplier {
  id: number;
  name: string;
  phone?: string;
  address?: string;
  contact_person?: string;
  dealer_name?: string;
  business_name?: string;
  cnic?: string;
  image_url?: string;
}

interface LedgerSummary {
  totalPurchased: number;
  totalPaid: number;
  balance: number;
}

interface SupplierDetailModalProps {
  supplier: Supplier | null;
  ledgerSummary?: LedgerSummary | null;
  onClose: () => void;
  onEdit: (s: Supplier) => void;
}

export function SupplierDetailModal({ supplier, ledgerSummary, onClose, onEdit }: SupplierDetailModalProps) {
  const [imageZoomed, setImageZoomed] = useState(false);

  if (!supplier) return null;

  const initials = supplier.name?.charAt(0)?.toUpperCase();

  return (
    <>
      {/* Detail Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
          {/* Banner / header area */}
          <div className="h-28 bg-gradient-to-br from-industrial-700 to-industrial-900" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Avatar */}
          <div className="absolute top-12 left-6">
            <div
              className="h-28 w-28 rounded-2xl border-4 border-white bg-industrial-100 shadow-lg flex items-center justify-center overflow-hidden cursor-pointer group"
              onClick={() => supplier.image_url && setImageZoomed(true)}
            >
              {supplier.image_url ? (
                <>
                  <img src={supplier.image_url} alt={supplier.name} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                    <ZoomIn className="h-6 w-6 text-white" />
                  </div>
                </>
              ) : (
                <span className="text-4xl font-bold text-industrial-500">{initials}</span>
              )}
            </div>
          </div>

          {/* Edit button in header area */}
          <div className="absolute top-[7.5rem] right-5 flex gap-2">
            <button
              onClick={() => { onClose(); onEdit(supplier); }}
              className="flex items-center gap-1.5 rounded-lg border border-industrial-200 bg-white px-3 py-1.5 text-xs font-semibold text-industrial-700 shadow-sm hover:bg-industrial-50 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          </div>

          {/* Content */}
          <div className="px-6 pt-16 pb-6 space-y-5">
            {/* Name */}
            <div>
              <h2 className="text-2xl font-bold text-industrial-900">{supplier.name}</h2>
              {supplier.address && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-industrial-500">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {supplier.address}
                </p>
              )}
            </div>

            {/* Contact info */}
            <div className="grid grid-cols-2 gap-3">
              {supplier.phone && (
                <div className="rounded-xl border border-industrial-100 bg-industrial-50 p-3">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-industrial-400">
                    <Phone className="h-3 w-3" /> Phone
                  </p>
                  <p className="text-sm font-semibold text-industrial-900">{supplier.phone}</p>
                </div>
              )}
              {supplier.contact_person && (
                <div className="rounded-xl border border-industrial-100 bg-industrial-50 p-3">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-industrial-400">
                    <User className="h-3 w-3" /> Contact Person
                  </p>
                  <p className="text-sm font-semibold text-industrial-900">{supplier.contact_person}</p>
                </div>
              )}
            </div>

            {/* Business info */}
            {(supplier.business_name || supplier.dealer_name || supplier.cnic) && (
              <div className="rounded-xl border-2 border-industrial-100 overflow-hidden">
                <div className="flex items-center gap-2 border-b border-industrial-100 bg-industrial-50 px-4 py-2.5">
                  <Building2 className="h-4 w-4 text-industrial-500" />
                  <span className="text-xs font-bold uppercase tracking-wide text-industrial-600">Business Details</span>
                </div>
                <div className="grid grid-cols-1 divide-y divide-industrial-100">
                  {supplier.business_name && (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Building2 className="h-4 w-4 shrink-0 text-industrial-400" />
                      <div>
                        <p className="text-xs text-industrial-400">Business Name</p>
                        <p className="text-sm font-semibold text-industrial-900">{supplier.business_name}</p>
                      </div>
                    </div>
                  )}
                  {supplier.dealer_name && (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Truck className="h-4 w-4 shrink-0 text-industrial-400" />
                      <div>
                        <p className="text-xs text-industrial-400">Dealer Name</p>
                        <p className="text-sm font-semibold text-industrial-900">{supplier.dealer_name}</p>
                      </div>
                    </div>
                  )}
                  {supplier.cnic && (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <CreditCard className="h-4 w-4 shrink-0 text-industrial-400" />
                      <div>
                        <p className="text-xs text-industrial-400">CNIC</p>
                        <p className="text-sm font-semibold text-industrial-900 font-mono">{supplier.cnic}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Purchase Summary */}
            {ledgerSummary && (
              <div className="rounded-xl border-2 border-industrial-100 overflow-hidden">
                <div className="flex items-center gap-2 border-b border-industrial-100 bg-industrial-50 px-4 py-2.5">
                  <ShoppingCart className="h-4 w-4 text-industrial-500" />
                  <span className="text-xs font-bold uppercase tracking-wide text-industrial-600">Purchase Summary</span>
                </div>
                <div className="grid grid-cols-3 divide-x divide-industrial-100">
                  <div className="px-4 py-3 text-center">
                    <p className="text-xs text-industrial-400 mb-1">Total Purchased</p>
                    <p className="text-sm font-bold text-industrial-900">Rs {ledgerSummary.totalPurchased.toLocaleString()}</p>
                  </div>
                  <div className="px-4 py-3 text-center">
                    <p className="text-xs text-industrial-400 mb-1">Total Paid</p>
                    <p className="text-sm font-bold text-green-700">Rs {ledgerSummary.totalPaid.toLocaleString()}</p>
                  </div>
                  <div className="px-4 py-3 text-center">
                    <p className="text-xs text-industrial-400 mb-1">Balance Due</p>
                    <p className={`text-sm font-bold ${ledgerSummary.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      Rs {ledgerSummary.balance.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full-screen image zoom */}
      {imageZoomed && supplier.image_url && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-zoom-out"
          onClick={() => setImageZoomed(false)}
        >
          <button
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40 transition-colors"
            onClick={() => setImageZoomed(false)}
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={supplier.image_url}
            alt={supplier.name}
            className="max-h-[90vh] max-w-[90vw] rounded-2xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
