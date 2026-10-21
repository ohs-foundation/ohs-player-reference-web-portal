export function locationNameClass(name: string | null, status: string | null | undefined): string {
  if (!name) return 'italic text-text-muted';
  return status === 'inactive' ? 'text-text-muted' : 'text-primary';
}
