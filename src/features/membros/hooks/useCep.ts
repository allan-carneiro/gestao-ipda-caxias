import { useRef, useState } from "react";
import { buscarCep } from "@/src/shared/services/cepService";

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

      const data = await buscarCep(cepDigits);

      if (latestRequestRef.current !== requestId) {
        return;
      }

      if (data?.erro) {
        setErro("CEP não encontrado.");
        return;
      }

      syncFormValue("logradouro", data.logradouro || "");
      syncFormValue("bairro", data.bairro || "");
      syncFormValue("cidade", data.localidade || "");
      syncFormValue("uf", data.uf || "");
     } catch (err) {
      if (latestRequestRef.current !== requestId) {
        return;
      }

      console.error(err);

      const userMessage =
        "Não foi possível buscar o CEP. Verifique o número digitado.";

      setErro(userMessage);
      toastErro(new Error(userMessage), userMessage);
    } finally {
      if (latestRequestRef.current === requestId) {
        setIsFetchingCep(false);
      }
    }
  }

  return {
    buscarCepAuto,
    isFetchingCep,
  };
}