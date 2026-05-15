import type {
  EstadoCivil,
  Membro,
  Status,
} from "../types";

type BuildMembroPayloadInput = {
  nomeSeguro: string;
  dataNascimento: string;
  cpfDigits: string;
  rg: string;

  estadoCivil: EstadoCivil;
  nomeConjuge: string;

  telefoneCelular: string;
  telefoneResidencial: string;
  email: string;

  logradouro: string;
  numero: string;
  complemento: string;
  lote: string;
  quadra: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;

  dataBatismo: string;
  campo: string;
  congregacao: string;
  pastor: string;
  cargoEclesiastico: string;

  naturalidade: string;
  escolaridade: string;
  profissao: string;

  filhosQtd: string;
  netosQtd: string;

  statusSeguro: Status;
  observacoes: string;

  fotoUrl: string | null;
  anexos: any[];

  numeroRol: string;
  ipdaPastor: string;
  telCarta: "" | "Tel." | "Carta";

  now: string;

  onlyDigits: (value: string) => string;
};

export function buildMembroPayload({
  nomeSeguro,
  dataNascimento,
  cpfDigits,
  rg,

  estadoCivil,
  nomeConjuge,

  telefoneCelular,
  telefoneResidencial,
  email,

  logradouro,
  numero,
  complemento,
  lote,
  quadra,
  bairro,
  cidade,
  uf,
  cep,

  dataBatismo,
  campo,
  congregacao,
  pastor,
  cargoEclesiastico,

  naturalidade,
  escolaridade,
  profissao,

  filhosQtd,
  netosQtd,

  statusSeguro,
  observacoes,

  fotoUrl,
  anexos,

  numeroRol,
  ipdaPastor,
  telCarta,

  now,

  onlyDigits,
}: BuildMembroPayloadInput): Membro {
  return {
    nomeCompleto: nomeSeguro,
    dataNascimento,
    cpf: cpfDigits,
    rg: onlyDigits(rg),
    estadoCivil,
    nomeConjuge: nomeConjuge.trim() || null,

    telefoneCelular: onlyDigits(telefoneCelular),
    telefoneResidencial: onlyDigits(telefoneResidencial) || null,
    email: email.trim() || null,

    endereco: {
      logradouro: logradouro.trim(),
      numero: numero.trim(),
      complemento: complemento.trim() || null,
      lote: lote.trim() || null,
      quadra: quadra.trim() || null,
      bairro: bairro.trim(),
      cidade: cidade.trim(),
      estado: uf.trim().toUpperCase(),
      cep: onlyDigits(cep) || null,
    },

    dataBatismo: dataBatismo || null,
    campo: campo.trim(),
    congregacao: congregacao.trim(),
    pastor: pastor.trim(),
    cargoEclesiastico: cargoEclesiastico.trim(),

    naturalidade: naturalidade.trim() || null,
    escolaridade: escolaridade.trim() || null,
    profissao: profissao.trim() || null,

    filhosQtd: filhosQtd.trim() === "" ? null : Math.max(0, Number(filhosQtd)),
    netosQtd: netosQtd.trim() === "" ? null : Math.max(0, Number(netosQtd)),

    status: statusSeguro,
    observacoes: observacoes.trim() || null,

    fotoUrl: fotoUrl ?? null,
    anexos: anexos ?? [],

    numeroRol: numeroRol.trim()
      ? Number(onlyDigits(numeroRol))
      : null,

    ipdaPastor: ipdaPastor.trim() || null,

    telCarta: (telCarta || "").trim()
      ? (telCarta as "Tel." | "Carta")
      : null,

    createdAt: now,
    updatedAt: now,
  };
}