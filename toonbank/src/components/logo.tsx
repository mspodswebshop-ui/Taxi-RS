export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 text-lg font-semibold tracking-tight ${light ? "text-white" : "text-ink-900"}`}>
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <rect width="32" height="32" rx="7" fill="#039855" />
        <path d="M7 13h18v3H7zM9 16h3v9H9zM20 16h3v9h-3zM10 7h12l3 6H7z" fill="#fff" />
      </svg>
      Toonbank
    </span>
  );
}
