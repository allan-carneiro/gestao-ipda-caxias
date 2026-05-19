import type { Status } from "../types";

type ValidateMembroFormInput = {
  nomeCompleto: string;
  dataNascimento: string;
  cpf: string;
  telefoneCelular: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  status: Status | string;
  onlyDigits: (value: string) => string;
  isValidCPF: (value: string) => boolean;
  isStatusValido: (value: unknown) => value is Status;
};

export type MembroFieldErrors = Partial<{
  nomeCompleto: string;
  dataNascimento: string;
  cpf: string;
  telefoneCelular: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  status: string;
}>;

export function validateMembroForm({
  nomeCompleto,
  dataNascimento,
  cpf,
  telefoneCelular,
  logradouro,
  numero,
  bairro,
  cidade,
  uf,
  status,
  onlyDigits,
  isValidCPF,
  isStatusValido,
}: ValidateMembroFormInput) {
  const errors: MembroFieldErrors = {};

  if (!nomeCompleto.trim()) errors.nomeCompleto = "Informe o nome completo.";
  if (!dataNascimento) errors.dataNascimento = "Informe a data de nascimento.";

  const cpfDigits = onlyDigits(cpf);
  if (!cpfDigits) errors.cpf = "Informe o CPF.";
  else if (!isValidCPF(cpfDigits)) errors.cpf = "CPF inválido.";

  const cel = onlyDigits(telefoneCelular);
  if (!cel) errors.telefoneCelular = "Informe o telefone celular.";
  else if (cel.length < 10) errors.telefoneCelular = "Telefone inválido.";

  if (!logradouro.trim()) errors.logradouro = "Informe o logradouro.";
  if (!numero.trim()) errors.numero = "Informe o número.";
  if (!bairro.trim()) errors.bairro = "Informe o bairro.";
  if (!cidade.trim()) errors.cidade = "Informe a cidade.";
  if (!uf.trim()) errors.uf = "Informe a UF.";

  if (!isStatusValido(status)) errors.status = "Selecione a situação (status).";

  return errors;
}