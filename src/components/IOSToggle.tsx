import { motion } from 'framer-motion';

interface IOSToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export default function IOSToggle({ checked, onChange, disabled = false }: IOSToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`
        relative inline-flex h-[31px] w-[51px] flex-shrink-0 cursor-pointer rounded-full
        transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2
        focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${
          checked
            ? 'bg-[#34C759]'
            : 'bg-gray-200 dark:bg-gray-700'
        }
      `}
    >
      <motion.span
        layout
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 30,
        }}
        className={`
          inline-block h-[27px] w-[27px] transform rounded-full bg-white shadow-lg
          transition-transform duration-300 ease-in-out
          ${checked ? 'translate-x-[22px]' : 'translate-x-[2px]'}
        `}
        style={{
          boxShadow: '0 3px 8px rgba(0, 0, 0, 0.15), 0 1px 1px rgba(0, 0, 0, 0.16)',
        }}
      />
    </button>
  );
}
