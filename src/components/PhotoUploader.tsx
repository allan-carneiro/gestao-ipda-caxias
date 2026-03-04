"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { uploadImageToCloudinaryWithProgress } from "@/src/lib/cloudinary";

type Props = {
  /** URL atual salva no banco (se tiver) */
  value?: string | null;

  /** Chamado quando a URL muda (nova foto ou remove) */
  onChange: (url: string | null) => void;

  /** Se você quiser desabilitar tudo (ex: salvando página) */
  disabled?: boolean;

  /** Título opcional */
  label?: string;
};

export default function PhotoUploader({
  value = null,
  onChange,
  disabled = false,
  label = "Foto",
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const currentPreview = useMemo(() => localPreview ?? value ?? null, [localPreview, value]);

  useEffect(() => {
    // limpa preview local quando URL do banco muda (ex: salvou/atualizou)
    setLocalPreview(null);
  }, [value]);

  function openPicker() {
    if (disabled || isUploading) return;
    inputRef.current?.click();
  }

  function clearMessageSoon() {
    window.setTimeout(() => setMsg(null), 3500);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    // validações simples
    if (!file.type.startsWith("image/")) {
      setMsg({ type: "error", text: "Escolha um arquivo de imagem (JPG/PNG/WebP)." });
      clearMessageSoon();
      e.target.value = "";
      return;
    }

    const maxMB = 8;
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxMB) {
      setMsg({ type: "error", text: `Imagem muito grande. Máximo: ${maxMB}MB.` });
      clearMessageSoon();
      e.target.value = "";
      return;
    }

    // preview imediato
    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);
    setMsg(null);

    // upload instantâneo + progresso
    setIsUploading(true);
    setProgress(0);

    try {
      const res = await uploadImageToCloudinaryWithProgress(file, (p) => setProgress(p));
      onChange(res.url);

      setMsg({ type: "success", text: "Foto atualizada com sucesso!" });
      clearMessageSoon();
    } catch (err) {
      console.error(err);
      setMsg({ type: "error", text: "Falha ao enviar a foto. Tente novamente." });
      clearMessageSoon();

      // se der erro, volta pro que estava salvo
      setLocalPreview(null);
    } finally {
      setIsUploading(false);
      setProgress(0);
      // permite escolher o mesmo arquivo de novo se quiser
      e.target.value = "";
      // libera objectUrl anterior
      URL.revokeObjectURL(objectUrl);
    }
  }

  function handleRemove() {
    if (disabled || isUploading) return;
    setLocalPreview(null);
    onChange(null);
    setMsg({ type: "success", text: "Foto removida." });
    clearMessageSoon();
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2 gap-2">
        <label className="font-semibold text-gray-800">{label}</label>

        {msg && (
          <span
            className={`text-sm px-3 py-1 rounded-full ${
              msg.type === "success"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {msg.text}
          </span>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Preview grande */}
        <div className="relative w-full md:w-[260px] h-[260px] rounded-2xl overflow-hidden bg-gray-100 border">
          {currentPreview ? (
            <Image
              src={currentPreview}
              alt="Foto do membro"
              fill
              className="object-cover"
              sizes="260px"
              priority={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
              Sem foto
            </div>
          )}

          {/* Loading overlay com barra */}
          {isUploading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-4">
              <div className="text-sm text-gray-700 font-medium">
                Enviando... {progress}%
              </div>

              <div className="w-full max-w-[210px] h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex-1">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openPicker}
              disabled={disabled || isUploading}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {currentPreview ? "Trocar foto" : "Adicionar foto"}
            </button>

            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled || isUploading || (!value && !localPreview)}
              className="px-4 py-2 rounded-xl bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:opacity-50"
            >
              Remover foto
            </button>
          </div>

          <p className="text-sm text-gray-500 mt-3">
            Dica: JPG/PNG/WebP. Até 8MB. Ao selecionar, o upload acontece automaticamente.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={disabled || isUploading}
          />
        </div>
      </div>
    </div>
  );
}
