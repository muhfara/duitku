export function Modal({ onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

export function RupiahInput({ rawValue, onRawChange, className, placeholder = '0', required, disabled }) {
  const formatted = rawValue
    ? rawValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    : '';
  const handleChange = (e) => {
    const raw = e.target.value.replace(/\./g, '').replace(/\D/g, '');
    onRawChange(raw);
  };
  return (
    <input
      type="text" inputMode="numeric"
      value={formatted} onChange={handleChange}
      placeholder={placeholder} required={required} disabled={disabled}
      className={className}
    />
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function inputCls(extra = '') {
  return `w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${extra}`;
}

export function selectCls(extra = '') {
  return `w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${extra}`;
}
