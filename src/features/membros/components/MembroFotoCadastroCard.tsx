import { Card } from "./FormLayout";

type MembroFotoCadastroCardProps = {
  fotoUrl: string | null;
  uploadingFoto: boolean;
  disabled: boolean;
  onUploadFoto: (file: File) => Promise<void>;
  onInvalidImage: () => void;
};

export function MembroFotoCadastroCard({
  fotoUrl,
  uploadingFoto,
  disabled,
  onUploadFoto,
  onInvalidImage,
}: MembroFotoCadastroCardProps) {
  return (
    <Card title="Foto">
      {fotoUrl ? (
        <div className="mb-4">
          <p className="mb-2 text-sm text-gray-600">Prévia da foto:</p>

          <img
            src={fotoUrl}
            alt="Foto do membro"
            className="h-28 rounded-xl border object-cover"
          />
        </div>
      ) : null}

      <input
        type="file"
        accept="image/*"
        disabled={disabled}
        onChange={async (e) => {
          const input = e.currentTarget;
          const file = input.files?.[0];

          input.value = "";

          if (!file) return;

          if (!file.type.startsWith("image/")) {
            onInvalidImage();
            return;
          }

          await onUploadFoto(file);
        }}
        className="block w-full rounded-xl border p-2"
      />

      <p className="mt-2 text-xs text-gray-500">
        {uploadingFoto ? "Enviando foto…" : "Formatos: JPG/PNG. Envio imediato."}
      </p>
    </Card>
  );
}