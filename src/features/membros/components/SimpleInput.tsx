import type { ChangeEvent, Dispatch, SetStateAction } from "react";

type SimpleInputProps = {
  label: string;
  value: string;
  disabled?: boolean;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  onChange: Dispatch<SetStateAction<string>>;
  inputClass: (hasError: boolean) => string;
  Field: React.ComponentType<{
    label: string;
    error?: string;
    children: React.ReactNode;
  }>;
};

export function SimpleInput({
  label,
  value,
  disabled = false,
  placeholder,
  inputMode,
  onChange,
  inputClass,
  Field,
}: SimpleInputProps) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value);
  }

  return (
    <Field label={label}>
      <input
        value={value}
        onChange={handleChange}
        className={inputClass(false)}
        placeholder={placeholder}
        inputMode={inputMode}
        disabled={disabled}
      />
    </Field>
  );
}