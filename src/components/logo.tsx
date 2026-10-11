export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden className="grid size-9 place-items-center rounded-xl bg-primary text-lg font-black text-on-primary">
        ₦
      </span>
      <span className="whitespace-nowrap text-base font-black tracking-tight sm:text-lg">
        No Broke <span className="text-accent-strong">Dayz</span>
      </span>
    </span>
  );
}
