import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  fullWidth?: boolean;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  value,
  onChange,
  placeholder,
  onKeyDown,
  disabled,
  className = '',
  fullWidth = false,
  error,
  ...props
}) => {
  const baseStyles = 'px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors';
  const widthStyles = fullWidth ? 'w-full' : '';
  const errorStyles = error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300';
  const disabledStyles = disabled ? 'bg-gray-100 opacity-70 cursor-not-allowed' : '';
  
  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onKeyDown={onKeyDown}
        disabled={disabled}
        className={`${baseStyles} ${widthStyles} ${errorStyles} ${disabledStyles} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default Input; 