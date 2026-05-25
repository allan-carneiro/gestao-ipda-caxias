import React from "react";
import { Card } from "./FormLayout";

type MembroDocumentosCardProps = {
  fotoUrl: string | null;
  anexos: any[];
  isBusy: boolean;
  uploadingFoto: boolean;
  uploadingAnexos: boolean;
  inputClass: (isError: boolean) => string;
  onUploadFoto: (file: File) => Promise<void>;
  onUploadAnexos: (files: FileList) => Promise<void>;
  onRemoveAnexo: (index: number) => void;
  onInvalidImage: () => void;
};

export function MembroDocumentosCard({
  fotoUrl,
  anexos,
  isBusy,
  uploadingFoto,
  uploadingAnexos,
  inputClass,
  onUploadFoto,
  onUploadAnexos,
  onRemoveAnexo,
  onInvalidImage,
}: MembroDocumentosCardProps) {
  return (
    <Card title="Documentos e foto">
      {fotoUrl ? (
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Foto atual:</p>

          <img
            src={fotoUrl}
            alt="Foto do membro"
            className="h-28 rounded-xl border object-cover"
          />
        </div>
      ) : null}

      <div>
        <label className="block text-sm font-medium mb-1">
          Trocar foto {uploadingFoto ? "(enviando...)" : ""}
        </label>

        <input
          type="file"
          accept="image/*"
          disabled={isBusy}
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
          className={inputClass(false)}
        />
      </div>

      {anexos?.length > 0 ? (
        <div className="mt-6">
          <p className="font-semibold mb-2">Arquivos anexados:</p>

          <div className="space-y-2">
            {anexos.map((a: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between border rounded-lg px-3 py-2"
              >
                <a
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
                  {a.nome}
                </a>

                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => onRemoveAnexo(i)}
                  className="text-red-600 text-sm disabled:opacity-60"
                >
                  remover
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6">
        <label className="block text-sm font-medium mb-1">
          Adicionar documentos {uploadingAnexos ? "(enviando...)" : ""}
        </label>

        <input
          type="file"
          multiple
          disabled={isBusy}
          onChange={async (e) => {
            const input = e.currentTarget;
            const files = input.files;

            input.value = "";

            if (!files) return;

            await onUploadAnexos(files);
          }}
          className={inputClass(false)}
        />
      </div>
    </Card>
  );
}