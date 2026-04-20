export function Table({ children }: { children: React.ReactNode }) {
  return <table className="w-full text-sm [&_tr:nth-child(even)]:bg-slate-50 [&_tr:hover]:bg-slate-100">{children}</table>;
}
