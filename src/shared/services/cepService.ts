type CepResponse = {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

async function fetchComTimeout(
  url: string,
  timeout = 5000
) {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
    });

    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function buscarViaCep(
  cep: string
): Promise<CepResponse> {
  const res = await fetchComTimeout(
    `https://viacep.com.br/ws/${cep}/json/`
  );

  if (!res.ok) {
    throw new Error("Erro no ViaCEP.");
  }

  return res.json();
}

async function buscarBrasilApi(
  cep: string
): Promise<CepResponse> {
  const res = await fetchComTimeout(
    `https://brasilapi.com.br/api/cep/v1/${cep}`
  );

  if (!res.ok) {
    throw new Error("Erro na BrasilAPI.");
  }

  const data = await res.json();

  return {
    logradouro: data.street,
    bairro: data.neighborhood,
    localidade: data.city,
    uf: data.state,
  };
}

export async function buscarCep(
  cep: string
): Promise<CepResponse> {
  try {
    const data = await buscarViaCep(cep);

    if (data?.erro) {
      throw new Error("CEP inválido.");
    }

    return data;
  } catch {
    return buscarBrasilApi(cep);
  }
}