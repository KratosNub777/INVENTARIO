// A diferencia del layout, el template se vuelve a montar en cada navegación: así la entrada se anima siempre.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="entrada">{children}</div>;
}
