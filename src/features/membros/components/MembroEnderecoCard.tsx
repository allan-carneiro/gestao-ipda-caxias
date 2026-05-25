import { Card, Field, Row } from "./FormLayout";
import { FormSection } from "./FormSection";
import { FormInput } from "./FormInput";
import { SimpleInput } from "./SimpleInput";
import { CepInput } from "./CepInput";
import type { MembroFormData } from "@/src/features/membros/schemas/membroSchema";

type MembroEnderecoCardProps = {
  logradouro: string;
  numero: string;
  complemento: string;
  lote: string;
  quadra: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;

  isBusy: boolean;
  isFetchingCep?: boolean;

  inputClass: (isError: boolean) => string;
  getFieldError: (field: keyof MembroFormData) => string | undefined;

  syncFormValue?: (field: keyof MembroFormData, value: string) => void;

  setLogradouro?: React.Dispatch<React.SetStateAction<string>>;
  setNumero?: React.Dispatch<React.SetStateAction<string>>;
  setBairro?: React.Dispatch<React.SetStateAction<string>>;
  setCidade?: React.Dispatch<React.SetStateAction<string>>;
  setUf?: React.Dispatch<React.SetStateAction<string>>;

  setComplemento: React.Dispatch<React.SetStateAction<string>>;
  setLote: React.Dispatch<React.SetStateAction<string>>;
  setQuadra: React.Dispatch<React.SetStateAction<string>>;
  setCep: React.Dispatch<React.SetStateAction<string>>;

  buscarCepAuto: (cepValue: string) => void;
  maskCEP: (value: string) => string;
  onlyDigits: (value: string) => string;
};

export function MembroEnderecoCard({
  logradouro,
  numero,
  complemento,
  lote,
  quadra,
  bairro,
  cidade,
  uf,
  cep,

  isBusy,
  isFetchingCep = false,

  inputClass,
  getFieldError,

  syncFormValue,

  setLogradouro,
  setNumero,
  setBairro,
  setCidade,
  setUf,

  setComplemento,
  setLote,
  setQuadra,
  setCep,

  buscarCepAuto,
  maskCEP,
  onlyDigits,
}: MembroEnderecoCardProps) {
  function updateFormValue(field: keyof MembroFormData, value: string) {
    if (syncFormValue) {
      syncFormValue(field, value);
      return;
    }

    if (field === "logradouro") setLogradouro?.(value);
    if (field === "numero") setNumero?.(value);
    if (field === "bairro") setBairro?.(value);
    if (field === "cidade") setCidade?.(value);
    if (field === "uf") setUf?.(value);
  }

  return (
    <Card title="Endereço completo">
      <FormSection title="Endereço completo">
        <Row>
          <FormInput
            label="Logradouro *"
            field="logradouro"
            value={logradouro}
            error={getFieldError("logradouro")}
            onChange={updateFormValue}
            inputClass={inputClass}
            Field={Field}
            disabled={isBusy}
          />

          <FormInput
            label="Número *"
            field="numero"
            value={numero}
            error={getFieldError("numero")}
            onChange={updateFormValue}
            inputClass={inputClass}
            Field={Field}
            disabled={isBusy}
          />

          <SimpleInput
            label="Complemento"
            value={complemento}
            onChange={setComplemento}
            inputClass={inputClass}
            Field={Field}
            disabled={isBusy}
          />
        </Row>

        <Row>
          <SimpleInput
            label="Lote"
            value={lote}
            onChange={setLote}
            inputClass={inputClass}
            Field={Field}
            disabled={isBusy}
          />

          <SimpleInput
            label="Quadra"
            value={quadra}
            onChange={setQuadra}
            inputClass={inputClass}
            Field={Field}
            disabled={isBusy}
          />

          <FormInput
            label="Bairro *"
            field="bairro"
            value={bairro}
            error={getFieldError("bairro")}
            onChange={updateFormValue}
            inputClass={inputClass}
            Field={Field}
            disabled={isBusy}
          />
        </Row>

        <Row>
          <FormInput
            label="Cidade *"
            field="cidade"
            value={cidade}
            error={getFieldError("cidade")}
            onChange={updateFormValue}
            inputClass={inputClass}
            Field={Field}
            disabled={isBusy}
          />

          <FormInput
            label="UF *"
            field="uf"
            value={uf}
            error={getFieldError("uf")}
            onChange={updateFormValue}
            inputClass={inputClass}
            Field={Field}
            placeholder="Ex: RJ"
            disabled={isBusy}
          />

          <CepInput
            value={cep}
            onChange={setCep}
            onCepComplete={buscarCepAuto}
            maskCEP={maskCEP}
            onlyDigits={onlyDigits}
            inputClass={inputClass}
            Field={Field}
            disabled={isBusy}
            isLoading={isFetchingCep}
          />
        </Row>
      </FormSection>
    </Card>
  );
}