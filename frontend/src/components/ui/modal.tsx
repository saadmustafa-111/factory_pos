import { Button } from './button';

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg industrial-card rounded-xl shadow-industrial-lg max-h-[90vh] flex flex-col min-h-0">
        <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 flex items-center justify-between border-b border-industrial-200 shrink-0">
          <h3 className="text-xl font-bold text-industrial-900">{title}</h3>
          <Button variant="outline" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>
        <div className="px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto flex-1 min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}
