import { useEffect, useRef, type ChangeEvent } from "react";

type CepInputProps = {
  value: string;
  disabled?: boolean;
  isLoading?: boolean;
  onChange: (value: string) => void;
  onCepComplete: (value: string) => void;
  maskCEP: (value: string) => string;
  onlyDigits: (value: string) => string;
  inputClass: (hasError: boolean) => string;
  Field: React.ComponentType<{
    label: string;
    error?: string;
    children: React.ReactNode;
  }>;
};

export function CepInput({
  value,
  disabled = false,
  isLoading = false,
  onChange,
  onCepComplete,
  maskCEP,
  onlyDigits,
  inputClass,
  Field,
}: CepInputProps) {
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const maskedValue = maskCEP(e.target.value);

    onChange(maskedValue);

    const digits = onlyDigits(maskedValue);

    if (digits.length === 8) {
      onCepComplete(maskedValue);
    }
  }
  useEffect(() => {
  return () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  };
}, []);

  return (
    <Field label="CEP">
      <input
        value={value}
        onChange={handleChange}
        className={inputClass(false)}
        inputMode="numeric"
        placeholder="25035-185"
        disabled={disabled}
      />
      {isLoading && (
  <p className="mt-1 text-xs text-muted-foreground">
    Buscando endereço...
  </p>
)}
    </Field>
  );
}