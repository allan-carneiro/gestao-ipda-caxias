import { useState } from "react";
import type { EstadoCivil, Status, TelCarta } from "@/src/features/membros/types";

export function useMembroFormData() {
  const [numeroRol, setNumeroRol] = useState<string>("");
  const [ipdaPastor, setIpdaPastor] = useState<string>("");
  const [telCarta, setTelCarta] = useState<TelCarta>("");

  const [nomeCompleto, setNomeCompleto] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [estadoCivil, setEstadoCivil] = useState<EstadoCivil>("Solteiro(a)");
  const [nomeConjuge, setNomeConjuge] = useState("");

  const [telefoneCelular, setTelefoneCelular] = useState("");
  const [telefoneResidencial, setTelefoneResidencial] = useState("");
  const [email, setEmail] = useState("");

  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [lote, setLote] = useState("");
  const [quadra, setQuadra] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [cep, setCep] = useState("");

  const [dataBatismo, setDataBatismo] = useState("");
  const [campo, setCampo] = useState("Duque de Caxias");
  const [congregacao, setCongregacao] = useState("");
  const [pastor, setPastor] = useState("");
  const [cargoEclesiastico, setCargoEclesiastico] = useState("");

  const [naturalidade, setNaturalidade] = useState("");
  const [escolaridade, setEscolaridade] = useState("");
  const [profissao, setProfissao] = useState("");
  const [filhosQtd, setFilhosQtd] = useState<string>("");
  const [netosQtd, setNetosQtd] = useState<string>("");

  const [status, setStatus] = useState<Status>("Ativo");
  const [observacoes, setObservacoes] = useState("");
const [fotoUrl, setFotoUrl] = useState<string | null>(null);
const [anexos, setAnexos] = useState<any[]>([]);
const [uploadingFoto, setUploadingFoto] = useState(false);
  return {
    numeroRol,
    setNumeroRol,
    ipdaPastor,
    setIpdaPastor,
    telCarta,
    setTelCarta,

    nomeCompleto,
    setNomeCompleto,
    dataNascimento,
    setDataNascimento,
    cpf,
    setCpf,
    rg,
    setRg,
    estadoCivil,
    setEstadoCivil,
    nomeConjuge,
    setNomeConjuge,

    telefoneCelular,
    setTelefoneCelular,
    telefoneResidencial,
    setTelefoneResidencial,
    email,
    setEmail,

    logradouro,
    setLogradouro,
    numero,
    setNumero,
    complemento,
    setComplemento,
    lote,
    setLote,
    quadra,
    setQuadra,
    bairro,
    setBairro,
    cidade,
    setCidade,
    uf,
    setUf,
    cep,
    setCep,

    dataBatismo,
    setDataBatismo,
    campo,
    setCampo,
    congregacao,
    setCongregacao,
    pastor,
    setPastor,
    cargoEclesiastico,
    setCargoEclesiastico,

    naturalidade,
    setNaturalidade,
    escolaridade,
    setEscolaridade,
    profissao,
    setProfissao,
    filhosQtd,
    setFilhosQtd,
    netosQtd,
    setNetosQtd,

    status,
    setStatus,
    observacoes,
    setObservacoes,
    fotoUrl,
setFotoUrl,
anexos,
setAnexos,
uploadingFoto,
setUploadingFoto,
  };
}