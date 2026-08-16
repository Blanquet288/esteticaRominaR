import './ModulePlaceholder.css';

export default function ModulePlaceholder({
  icon: Icon,
  title,
  description,
}) {
  return (
    <section className="module-placeholder">
      <div className="placeholder-icon">
        <Icon size={28} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      <span className="placeholder-badge">Módulo en construcción</span>
    </section>
  );
}
