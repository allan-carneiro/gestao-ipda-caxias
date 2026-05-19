import { useState } from "react";

export function useMembroForm() {
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  function clearMessages() {
    setErro(null);
    setSucesso(null);
  }

  return {
    erro,
    sucesso,

    setErro,
    setSucesso,

    clearMessages,
  };
}