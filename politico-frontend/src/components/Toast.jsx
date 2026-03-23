import { useState, forwardRef, useImperativeHandle } from 'react';

const Toast = forwardRef((_, ref) => {
  const [msg,     setMsg]     = useState('');
  const [type,    setType]    = useState('success');
  const [visible, setVisible] = useState(false);

  useImperativeHandle(ref, () => ({
    show(message, kind = 'success') {
      setMsg(message);
      setType(kind);
      setVisible(true);
      setTimeout(() => setVisible(false), 3200);
    }
  }));

  return (
    <div
      id="toast"
      className={visible ? 'show' : ''}
      style={{ borderLeftColor: type === 'error' ? 'var(--danger)' : 'var(--gold)' }}>
      {msg}
    </div>
  );
});

export default Toast;