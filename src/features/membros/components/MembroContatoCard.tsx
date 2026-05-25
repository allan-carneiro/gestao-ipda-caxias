import { Card, Field, Row } from "./FormLayout";
import type { MembroFormData } from "@/src/features/membros/schemas/membroSchema";

type MembroContatoCardProps = {
  telefoneCelular: string;
  telefoneResidencial: string;
  email: string;
  isBusy: boolean;
  inputClass: (isError: boolean) => string;
  getFieldError: (field: keyof MembroFormData) => string | undefined;
  hasFieldError: (field: keyof MembroFormData) => boolean;
  maskPhone: (value: string) => string;
  setTelefoneCelular: (value: string) => void;
  setTelefoneResidencial: (value: string) => void;
  setEmail: (value: string) => void;
  syncFormValue: (field: keyof MembroFormData, value: string) => void;
};

export function MembroContatoCard({
  telefoneCelular,
  telefoneResidencial,
  email,
  isBusy,
  inputClass,
  getFieldError,
  hasFieldError,
  maskPhone,
  setTelefoneCelular,
  setTelefoneResidencial,
  setEmail,
  syncFormValue,
}: MembroContatoCardProps) {
  return (
    <Card title="Contato">
      <Row>
        <Field
          label="Telefone celular *"
          error={getFieldError("telefoneCelular")}
        >
          <input
            value={telefoneCelular}
            onChange={(e) => {
              const value = maskPhone(e.target.value);

              setTelefoneCelular(value);
              syncFormValue("telefoneCelular", value);
            }}
            className={inputClass(hasFieldError("telefoneCelular"))}
            inputMode="numeric"
            disabled={isBusy}
          />
        </Field>

        <Field label="Telefone residencial">
          <input
            value={telefoneResidencial}
            onChange={(e) => setTelefoneResidencial(maskPhone(e.target.value))}
            className={inputClass(false)}
            inputMode="numeric"
            placeholder="(21) 0000-0000"
            disabled={isBusy}
          />
        </Field>

        <Field label="E-mail">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass(false)}
            type="email"
            disabled={isBusy}
          />
        </Field>
      </Row>
    </Card>
  );
}