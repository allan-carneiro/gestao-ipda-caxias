import { useState } from "react";

export function useMembroFormData() {
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [anexos, setAnexos] = useState<any[]>([]);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  return {
    fotoUrl,
    setFotoUrl,
    anexos,
    setAnexos,
    uploadingFoto,
    setUploadingFoto,
  };
}