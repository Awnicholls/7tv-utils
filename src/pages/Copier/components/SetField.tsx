import type { ReactNode } from 'react';

interface SetFieldProps {
  disabled?: boolean;
  hint?: string;
  label: string;
  onBlur?: () => void;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}

export const SetField = ({
  disabled,
  hint,
  label,
  onBlur,
  onChange,
  placeholder,
  value,
}: SetFieldProps): ReactNode => {
  const id = `f-${label}`;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        autoComplete="off"
        disabled={disabled}
        id={id}
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
};
