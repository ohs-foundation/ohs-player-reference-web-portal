export function BrandMark({ size = 28 }: Readonly<{ size?: number }>): React.ReactElement {
  return (
    <img
      src="/brand/ohs-logo.png"
      alt="Open Health Stack"
      width={size}
      height={size}
      style={{ display: 'block', objectFit: 'contain' }}
    />
  );
}
