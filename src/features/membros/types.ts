export type EstadoCivil =
  | "Solteiro(a)"
  | "Casado(a)"
  | "Divorciado(a)"
  | "Viúvo(a)"
  | "União estável";

export type Status = "Ativo" | "Inativo";

export type TelCarta = "" | "Tel." | "Carta";

export type Membro = {
  nomeCompleto?: string;
  dataNascimento?: string;
  cpf?: string;
  rg?: string;
  estadoCivil?: EstadoCivil;
  nomeConjuge?: string | null;

  telefoneCelular?: string;
  telefoneResidencial?: string | null;
  email?: string | null;

  endereco?: {
    logradouro?: string;
    numero?: string;
    complemento?: string | null;
    lote?: string | null;
    quadra?: string | null;
    bairro?: string;
    cidade?: string;
    estado?: string;
    cep?: string | null;
  };

  dataBatismo?: string | null;
  campo?: string;
  congregacao?: string;
  pastor?: string;
  cargoEclesiastico?: string;

  naturalidade?: string | null;
  escolaridade?: string | null;
  profissao?: string | null;
  filhosQtd?: number | null;
  netosQtd?: number | null;

  status?: Status;
  observacoes?: string | null;

  fotoUrl?: string | null;
  anexos?: any[];

  numeroRol?: number | null;
  ipdaPastor?: string | null;
  telCarta?: "Tel." | "Carta" | null;

  createdAt?: string;
  updatedAt?: string;
};