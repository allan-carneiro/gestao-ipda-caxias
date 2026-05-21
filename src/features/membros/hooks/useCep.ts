import { useRef, useState } from "react";

type UseCepParams = {
  setErro: (value: string | null) => void;
  toastErro: (err: unknown, fallback: string) => void;

  syncFormValue: (
    field: "logradouro" | "bairro" | "cidade" | "uf",
    value: string
  ) => void;
};

export function useCep({
  setErro,
  toastErro,
  syncFormValue,
}: UseCepParams) {
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const latestRequestRef = useRef(0);

  async function buscarCepAuto(cepValue: string) {
    const cepDigits = cepValue.replace(/\D/g, "");

    if (cepDigits.length !== 8) return;
    const requestId = Date.now();

latestRequestRef.current = requestId;

    try {
      setIsFetchingCep(true);
      setErro(null);

      const res = await fetch(
        `https://viacep.com.br/ws/${cepDigits}/json/`
      );

      const data = await res.json();

      if (data?.erro) {
        setErro("CEP não encontrado.");
        return;
      }

      syncFormValue("logradouro", data.logradouro || "");
      syncFormValue("bairro", data.bairro || "");
      syncFormValue("cidade", data.localidade || "");
      syncFormValue("uf", data.uf || "");
    } catch (err) {
      console.error(err);
      toastErro(err, "Erro ao buscar CEP.");
    } finally {
      setIsFetchingCep(false);
    }
  }

  return {
    buscarCepAuto,
    isFetchingCep,
  };
}