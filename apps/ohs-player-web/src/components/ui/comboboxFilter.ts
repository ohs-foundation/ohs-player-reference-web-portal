export interface ComboboxOption {
  value: string;
  label: string;
}

/** Case-insensitive substring match on label (and value as fallback). */
export function filterComboboxOptions(
  options: readonly ComboboxOption[],
  query: string,
): ComboboxOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...options];
  return options.filter(
    (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
  );
}
