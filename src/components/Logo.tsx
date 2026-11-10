export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M7 8a5 5 0 0 1 9-2" /><path d="M17 16a5 5 0 0 1-9 2" /><path d="M16 3v3h-3" /><path d="M8 21v-3h3" />
        </svg>
      </span>
      <span className="text-[15px] font-semibold tracking-tight">SpecLoop</span>
    </span>
  );
}
