import type {
  EstadoCivil,
  Membro,
  Status,
} from "../types";

type BuildUpdateMembroPayloadInput = {
  nomeSeguro: string;

  dataNascimento: string;
  cpf: string;
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

  status: Status;
  observacoes: string;

  fotoUrl: string | null;
  anexos: any[];

  now: string;

  onlyDigits: (value: string) => string;
};

export function buildUpdateMembroPayload({
  nomeSeguro,

  dataNascimento,
  cpf,
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

  status,
  observacoes,

  fotoUrl,
  anexos,

  now,

  onlyDigits,
}: BuildUpdateMembroPayloadInput): Partial<Membro> {
  return {
    nomeCompleto: nomeSeguro,
    dataNascimento,
    cpf: onlyDigits(cpf),
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

    filhosQtd:
      filhosQtd.trim() === ""
        ? null
        : Math.max(0, Number(filhosQtd)),

    netosQtd:
      netosQtd.trim() === ""
        ? null
        : Math.max(0, Number(netosQtd)),

    status,
    observacoes: observacoes.trim() || null,

    fotoUrl: fotoUrl ? fotoUrl.trim() : null,
    anexos: anexos ?? [],

    updatedAt: now,
  };
}