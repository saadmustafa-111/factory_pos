export function Table({ children }: { children: React.ReactNode }) {
  return <table className="w-full text-sm [&_tr:nth-child(even)]:bg-industrial-50 [&_tr:hover]:bg-industrial-100 [&_th]:text-left [&_th]:font-bold [&_th]:text-industrial-800 [&_th]:pb-3 [&_td]:py-3 [&_td]:text-industrial-700">{children}</table>;
}
