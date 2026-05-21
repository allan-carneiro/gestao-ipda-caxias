
import type { ChangeEvent } from "react";
import type { MembroFormData } from "../schemas/membroSchema";

type FormInputProps = {
  label: string;
  field: keyof MembroFormData;
  value: string;
  disabled?: boolean;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  error?: string;
  onChange: (field: keyof MembroFormData, value: string) => void;
  inputClass: (hasError: boolean) => string;
  Field: React.ComponentType<{
    label: string;
    error?: string;
    children: React.ReactNode;
  }>;
};

export function FormInput({
  label,
  field,
  value,
  disabled = false,
  placeholder,
  inputMode,
  error,
  onChange,
  inputClass,
  Field,
}: FormInputProps) {
  const hasError = Boolean(error);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    onChange(field, e.target.value);
  }

  return (
    <Field label={label} error={error}>
      <input
        value={value}
        onChange={handleChange}
        className={inputClass(hasError)}
        placeholder={placeholder}
        inputMode={inputMode}
        disabled={disabled}
      />
    </Field>
  );
}