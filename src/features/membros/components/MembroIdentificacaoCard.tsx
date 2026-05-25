import { Card, Field, Row } from "./FormLayout";
import { FormInput } from "./FormInput";
import type { EstadoCivil } from "@/src/features/membros/types";
import type { MembroFormData } from "@/src/features/membros/schemas/membroSchema";

type MembroIdentificacaoCardProps = {
  nomeCompleto: string;
  dataNascimento: string;
  cpf: string;
  rg: string;
  estadoCivil: EstadoCivil;
  nomeConjuge: string;
  idadeTxt: string;
  isBusy: boolean;
  isFetchingCep?: boolean;
  inputClass: (isError: boolean) => string;
  getFieldError: (field: keyof MembroFormData) => string | undefined;
  hasFieldError: (field: keyof MembroFormData) => boolean;
  syncFormValue?: (field: keyof MembroFormData, value: string) => void;
  maskCPF: (value: string) => string;
  setNomeCompleto?: (value: string) => void;
  setDataNascimento: (value: string) => void;
  setCpf: (value: string) => void;
  setRg: (value: string) => void;
  setEstadoCivil: (value: EstadoCivil) => void;
  setNomeConjuge: (value: string) => void;
};

export function MembroIdentificacaoCard({
  nomeCompleto,
  dataNascimento,
  cpf,
  rg,
  estadoCivil,
  nomeConjuge,
  idadeTxt,
  isBusy,
  isFetchingCep = false,
  inputClass,
  getFieldError,
  hasFieldError,
  syncFormValue,
  maskCPF,
  setNomeCompleto,
  setDataNascimento,
  setCpf,
  setRg,
  setEstadoCivil,
  setNomeConjuge,
}: MembroIdentificacaoCardProps) {
  function updateFormValue(field: keyof MembroFormData, value: string) {
    if (syncFormValue) {
      syncFormValue(field, value);
      return;
    }

    if (field === "nomeCompleto") setNomeCompleto?.(value);
    if (field === "dataNascimento") setDataNascimento(value);
    if (field === "cpf") setCpf(value);
  }

  return (
    <Card title="Identificação">
      <Row>
        <FormInput
          label="Nome completo *"
          field="nomeCompleto"
          value={nomeCompleto}
          error={getFieldError("nomeCompleto")}
          onChange={updateFormValue}
          inputClass={inputClass}
          Field={Field}
          disabled={isBusy || isFetchingCep}
        />

        <Field
          label="Data de nascimento *"
          error={getFieldError("dataNascimento")}
        >
          <input
            type="date"
            value={dataNascimento}
            onChange={(e) => updateFormValue("dataNascimento", e.target.value)}
            className={inputClass(hasFieldError("dataNascimento"))}
            disabled={isBusy}
          />

          <p className="mt-2 text-xs text-gray-600">
            Idade (automática):{" "}
            <span className="font-semibold">{idadeTxt || "—"}</span>
          </p>
        </Field>

        <Field label="CPF *" error={getFieldError("cpf")}>
          <input
            value={cpf}
            onChange={(e) => {
              const value = maskCPF(e.target.value);
              updateFormValue("cpf", value);
            }}
            className={inputClass(hasFieldError("cpf"))}
            inputMode="numeric"
            placeholder="000.000.000-00"
            disabled={isBusy}
          />
        </Field>
      </Row>

      <Row>
        <Field label="RG">
          <input
            value={rg}
            onChange={(e) => setRg(e.target.value)}
            className={inputClass(false)}
            disabled={isBusy}
          />
        </Field>

        <Field label="Estado civil">
          <select
            value={estadoCivil}
            onChange={(e) => setEstadoCivil(e.target.value as EstadoCivil)}
            className={inputClass(false)}
            disabled={isBusy}
          >
            <option>Solteiro(a)</option>
            <option>Casado(a)</option>
            <option>União estável</option>
            <option>Divorciado(a)</option>
            <option>Viúvo(a)</option>
          </select>
        </Field>

        <Field label="Nome do cônjuge">
          <input
            value={nomeConjuge}
            onChange={(e) => setNomeConjuge(e.target.value)}
            className={inputClass(false)}
            disabled={isBusy}
          />
        </Field>
      </Row>
    </Card>
  );
}