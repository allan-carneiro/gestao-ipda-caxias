export type CloudinaryUploadResult = {
  url: string;
  publicId: string;
  bytes: number;
  width: number;
  height: number;
  format: string;
};

export async function uploadImageToCloudinary(
  file: File
): Promise<CloudinaryUploadResult> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      "Cloudinary não configurado: faltam ENV NEXT_PUBLIC_CLOUDINARY_*"
    );
  }

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", uploadPreset);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: form,
    }
  );

  // Cloudinary costuma retornar JSON até em erro, então tentamos ler JSON primeiro
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // se não for JSON, cai no fallback abaixo
  }

  if (!res.ok) {
    const msg = data?.error?.message
      ? String(data.error.message)
      : "Erro desconhecido no upload";
    throw new Error(`Falha ao enviar para Cloudinary: ${msg}`);
  }

  // validações mínimas pra evitar undefined silencioso
  const secureUrl = data?.secure_url;
  const publicId = data?.public_id;

  if (!secureUrl || !publicId) {
    throw new Error("Resposta inválida do Cloudinary (faltam secure_url/public_id).");
  }

  return {
    url: String(secureUrl),
    publicId: String(publicId),
    bytes: Number(data?.bytes ?? 0),
    width: Number(data?.width ?? 0),
    height: Number(data?.height ?? 0),
    format: String(data?.format ?? ""),
  };
}

/**
 * Upload com progresso real (%), ideal para UI com barra de carregamento.
 * Usa XMLHttpRequest porque fetch não expõe progresso de upload no browser.
 */
export function uploadImageToCloudinaryWithProgress(
  file: File,
  onProgress?: (percent: number) => void
): Promise<CloudinaryUploadResult> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    return Promise.reject(
      new Error("Cloudinary não configurado: faltam ENV NEXT_PUBLIC_CLOUDINARY_*")
    );
  }

  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", uploadPreset);

    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`
    );

    // progresso real do upload
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.round((event.loaded / event.total) * 100);
      onProgress?.(percent);
    };

    xhr.onerror = () => reject(new Error("Erro de rede durante o upload."));
    xhr.onabort = () => reject(new Error("Upload cancelado."));

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText || "{}");

        if (xhr.status < 200 || xhr.status >= 300) {
          const msg = data?.error?.message
            ? String(data.error.message)
            : "Erro desconhecido no upload";
          reject(new Error(`Falha ao enviar para Cloudinary: ${msg}`));
          return;
        }

        const secureUrl = data?.secure_url;
        const publicId = data?.public_id;

        if (!secureUrl || !publicId) {
          reject(
            new Error("Resposta inválida do Cloudinary (faltam secure_url/public_id).")
          );
          return;
        }

        resolve({
          url: String(secureUrl),
          publicId: String(publicId),
          bytes: Number(data?.bytes ?? 0),
          width: Number(data?.width ?? 0),
          height: Number(data?.height ?? 0),
          format: String(data?.format ?? ""),
        });
      } catch {
        reject(new Error("Não foi possível interpretar a resposta do Cloudinary."));
      }
    };

    xhr.send(form);
  });
}
