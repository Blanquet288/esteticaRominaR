export default function PrintLogo({ src, alt = 'Logo' }) {
  if (!src) return null;
  return <img className="print-logo" src={src} alt={alt} />;
}
