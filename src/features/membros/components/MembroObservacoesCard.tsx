import { Card } from "./FormLayout";

type MembroObservacoesCardProps = {
  value: string;
  disabled: boolean;
  textareaClass: (isError: boolean) => string;
  onChange: (value: string) => void;
};

export function MembroObservacoesCard({
  value,
  disabled,
  textareaClass,
  onChange,
}: MembroObservacoesCardProps) {
  return (
    <Card title="Observações">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={textareaClass(false)}
        placeholder="Observações gerais sobre o membro..."
        disabled={disabled}
      />
    </Card>
  );
}