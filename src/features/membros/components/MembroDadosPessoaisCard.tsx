import { Card, Field, Row } from "./FormLayout";
import type { Status } from "@/src/features/membros/types";

type MembroDadosPessoaisCardProps = {
  naturalidade: string;
  escolaridade: string;
  profissao: string;
  filhosQtd: string;
  netosQtd: string;
  status: Status;
  statusError?: string;
  isBusy: boolean;
  inputClass: (isError: boolean) => string;
  setNaturalidade: (value: string) => void;
  setEscolaridade: (value: string) => void;
  setProfissao: (value: string) => void;
  setFilhosQtd: (value: string) => void;
  setNetosQtd: (value: string) => void;
  setStatus: (value: Status) => void;
};

export function MembroDadosPessoaisCard({
  naturalidade,
  escolaridade,
  profissao,
  filhosQtd,
  netosQtd,
  status,
  statusError,
  isBusy,
  inputClass,
  setNaturalidade,
  setEscolaridade,
  setProfissao,
  setFilhosQtd,
  setNetosQtd,
  setStatus,
}: MembroDadosPessoaisCardProps) {
  return (
    <Card title="Dados pessoais">
      <Row>
        <Field label="Naturalidade">
          <input
            value={naturalidade}
            onChange={(e) => setNaturalidade(e.target.value)}
            className={inputClass(false)}
            disabled={isBusy}
          />
        </Field>

        <Field label="Escolaridade">
          <input
            value={escolaridade}
            onChange={(e) => setEscolaridade(e.target.value)}
            className={inputClass(false)}
            disabled={isBusy}
          />
        </Field>

        <Field label="Profissão">
          <input
            value={profissao}
            onChange={(e) => setProfissao(e.target.value)}
            className={inputClass(false)}
            disabled={isBusy}
          />
        </Field>
      </Row>

      <Row>
        <Field label="Filhos (qtd)">
          <input
            value={filhosQtd}
            onChange={(e) => setFilhosQtd(e.target.value)}
            className={inputClass(false)}
            inputMode="numeric"
            disabled={isBusy}
          />
        </Field>

        <Field label="Netos (qtd)">
          <input
            value={netosQtd}
            onChange={(e) => setNetosQtd(e.target.value)}
            className={inputClass(false)}
            inputMode="numeric"
            disabled={isBusy}
          />
        </Field>

        <Field label="Situação (Status) *" error={statusError}>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
            className={inputClass(!!statusError)}
            disabled={isBusy}
          >
            <option value="Ativo">Ativo</option>
            <option value="Inativo">Inativo</option>
          </select>
        </Field>
      </Row>
    </Card>
  );
}