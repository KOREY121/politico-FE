export default function Modal({ open, onClose, title, subtitle, children }) {
  if (!open) return null;
  return (
    <div
      className="modal-overlay open"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>{title}</h2>
        {subtitle && <p className="modal-sub">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}