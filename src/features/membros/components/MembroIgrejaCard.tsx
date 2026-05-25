import { Card, Field, Row } from "./FormLayout";

type MembroIgrejaCardProps = {
  dataBatismo: string;
  campo: string;
  congregacao: string;
  pastor: string;
  cargoEclesiastico: string;
  isBusy: boolean;
  inputClass: (isError: boolean) => string;
  setDataBatismo: (value: string) => void;
  setCampo: (value: string) => void;
  setCongregacao: (value: string) => void;
  setPastor: (value: string) => void;
  setCargoEclesiastico: (value: string) => void;
};

export function MembroIgrejaCard({
  dataBatismo,
  campo,
  congregacao,
  pastor,
  cargoEclesiastico,
  isBusy,
  inputClass,
  setDataBatismo,
  setCampo,
  setCongregacao,
  setPastor,
  setCargoEclesiastico,
}: MembroIgrejaCardProps) {
  return (
    <Card title="Igreja">
      <Row>
        <Field label="Data de batismo">
          <input
            type="date"
            value={dataBatismo}
            onChange={(e) => setDataBatismo(e.target.value)}
            className={inputClass(false)}
            disabled={isBusy}
          />
        </Field>

        <Field label="Campo">
          <select
            value={campo}
            onChange={(e) => setCampo(e.target.value)}
            className={inputClass(false)}
            disabled={isBusy}
          >
            <option>Duque de Caxias</option>
            <option>Rio de Janeiro</option>
          </select>
        </Field>

        <Field label="Congregação">
          <input
            value={congregacao}
            onChange={(e) => setCongregacao(e.target.value)}
            className={inputClass(false)}
            disabled={isBusy}
          />
        </Field>
      </Row>

      <Row>
        <Field label="Pastor">
          <input
            value={pastor}
            onChange={(e) => setPastor(e.target.value)}
            className={inputClass(false)}
            disabled={isBusy}
          />
        </Field>

        <Field label="Cargo eclesiástico">
          <input
            value={cargoEclesiastico}
            onChange={(e) => setCargoEclesiastico(e.target.value)}
            className={inputClass(false)}
            disabled={isBusy}
          />
        </Field>
      </Row>
    </Card>
  );
}