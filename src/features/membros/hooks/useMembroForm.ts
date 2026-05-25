import { useState } from "react";

export function useMembroForm() {
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  function clearMessages() {
    setErro(null);
    setSucesso(null);
  }

  function showError(message: string) {
    setErro(message);
    setSucesso(null);
  }

  function showSuccess(message: string) {
    setSucesso(message);
    setErro(null);
  }

  return {
    erro,
    sucesso,

    showError,
    showSuccess,

    clearMessages,
  };
}