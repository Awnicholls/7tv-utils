import type { ReactNode } from 'react';

interface SetFieldProps {
  disabled?: boolean;
  hint?: string;
  id: string;
  label: string;
  maxLength?: number;
  onBlur?: () => void;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}

export const SetField = ({
  disabled,
  hint,
  id,
  label,
  maxLength,
  onBlur,
  onChange,
  placeholder,
  value,
}: SetFieldProps): ReactNode => (
  <div className="field">
    <label htmlFor={id}>{label}</label>
    <input
      autoComplete="off"
      disabled={disabled}
      id={id}
      maxLength={maxLength}
      onBlur={onBlur}
      onChange={(e) => {
        onChange(e.target.value);
      }}
      placeholder={placeholder}
      spellCheck={false}
      value={value}
    />
    {hint && <p className="hint">{hint}</p>}
  </div>
);
