"use client";
import { buildMembroPayload } from "@/src/features/membros/utils/buildMembroPayload";
import { buildMembroAuditSnapshot } from "@/src/features/membros/utils/buildMembroAuditSnapshot";
import { createMembro } from "@/src/features/membros/services/createMembro";
import React, { useEffect, useMemo, useState } from "react";
import { db } from "@/src/lib/firebase";

import AuthGuard from "@/app/components/AuthGuard";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { uploadImageToCloudinary } from "@/src/lib/cloudinary";
import { useToast } from "@/app/components/ToastProvider";
import { cleanMembroPayload } from "@/src/lib/validators";
import { getUserRoleFromToken } from "@/src/lib/auth/getUserRole";
import { getPaths } from "@/src/lib/demo/paths";
import { canEditMembers, isDemo } from "@/src/lib/auth/permissions";
import type { UserRole } from "@/src/types/auth";
import type {
  EstadoCivil,
  Status,
  TelCarta,
  Membro,
} from "@/src/features/membros/types";


type FieldErrors = Record<string, string>;

const IPDA_PASTOR_OPCOES = ["", "IPDA Caxias", "IPDA — Pastor"] as const;

const CARGOS = [
  "",
  "Membro",
  "Obreiro",
  "Diácono",
  "Presbítero",
  "Pastor",
  "Expansão",
  "Levita do Ministério de Louvor",
  "Instrumentista",
] as const;

function isStatusValido(v: any): v is Status {
  return v === "Ativo" || v === "Inativo";
}

function isValidDate(d: Date) {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

function parseBRToISO(br: string) {
  const m = String(br || "").trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

function parseNascimentoToDate(v?: string | null) {
  const s = String(v ?? "").trim();
  if (!s) return null;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const iso = parseBRToISO(s);
    if (!iso) return null;
    const d = new Date(`${iso}T00:00:00`);
    return isValidDate(d) ? d : null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T00:00:00`);
    return isValidDate(d) ? d : null;
  }

  const d = new Date(s);
  return isValidDate(d) ? d : null;
}

function calcularIdade(dataNasc?: string | null) {
  const d = parseNascimentoToDate(dataNasc);
  if (!d) return null;

  const now = new Date();
  let idade = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) idade--;

  if (idade < 0 || idade > 130) return null;
  return idade;
}

function formatarIdade(idade: number | null) {
  if (idade === null) return "";
  return `${idade} ano${idade === 1 ? "" : "s"}`;
}



export default function NovoMembroPage() {
  const router = useRouter();
  const toast = useToast();

  const [loadingRole, setLoadingRole] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

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

  const paths = useMemo(() => getPaths(userRole ?? undefined), [userRole]);
  const demoMode = useMemo(() => isDemo(userRole ?? undefined), [userRole]);
  const allowCreateMembers = useMemo(
    () => canEditMembers(userRole ?? undefined) && !isDemo(userRole ?? undefined),
    [userRole]
  );

  const isBusy = saving || uploadingFoto || loadingRole;
  const formDisabled = isBusy || !allowCreateMembers;

  useEffect(() => {
    let active = true;

    async function loadRole() {
      try {
        setLoadingRole(true);
        const role = await getUserRoleFromToken();
        if (active) setUserRole(role);
      } catch (error) {
        console.error(error);
        if (active) setUserRole(null);
      } finally {
        if (active) setLoadingRole(false);
      }
    }

    void loadRole();

    return () => {
      active = false;
    };
  }, []);

  function toastErro(e: any, fallback: string) {
    const msg =
      typeof e?.message === "string" && e.message.trim()
        ? e.message
        : typeof e === "string" && e.trim()
        ? e
        : fallback;

    const finalMsg = msg.startsWith("Erro:") ? msg : `Erro: ${msg}`;
    toast.error(finalMsg);
    setErro(finalMsg);
  }

  function toastOk(msg: string) {
    toast.success(msg);
    setSucesso(msg);
    setTimeout(() => setSucesso(null), 1200);
  }

  async function runAction(opts: {
    busySetter?: (v: boolean) => void;
    fn: () => Promise<void>;
    success?: string;
    errorFallback: string;
  }) {
    try {
      opts.busySetter?.(true);
      await opts.fn();
      if (opts.success) toastOk(opts.success);
    } catch (e: any) {
      console.error(e);
      toastErro(e, opts.errorFallback);
    } finally {
      opts.busySetter?.(false);
    }
  }

  const idade = useMemo(() => calcularIdade(dataNascimento ?? null), [dataNascimento]);
  const idadeTxt = useMemo(() => formatarIdade(idade), [idade]);

  function onlyDigits(v: string) {
    return (v || "").replace(/\D/g, "");
  }

  function normalizeNomeCompleto(nome: string) {
    const cleaned = String(nome ?? "").trim().replace(/\s+/g, " ");
    if (!cleaned) return "";

    const lowerWords = new Set(["da", "de", "do", "das", "dos", "e"]);
    return cleaned
      .split(" ")
      .map((w, i) => {
        const wl = w.toLowerCase();
        if (i > 0 && lowerWords.has(wl)) return wl;
        return wl.charAt(0).toUpperCase() + wl.slice(1);
      })
      .join(" ");
  }

  function maskCPF(v: string) {
    const d = onlyDigits(v).slice(0, 11);
    return d
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
  }

  function maskCEP(v: string) {
    const d = onlyDigits(v).slice(0, 8);
    return d.replace(/^(\d{5})(\d)/, "$1-$2");
  }

  function maskPhone(v: string) {
    const d = onlyDigits(v).slice(0, 11);
    if (!d) return "";
    if (d.length <= 10) {
      return d
        .replace(/^(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }
    return d
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
  }

  function isValidCPF(cpfDigits: string) {
    const cpf = (cpfDigits || "").replace(/\D/g, "");
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    const calcDigit = (base: string, factorStart: number) => {
      let sum = 0;
      for (let i = 0; i < base.length; i++) sum += Number(base[i]) * (factorStart - i);
      const mod = sum % 11;
      return mod < 2 ? 0 : 11 - mod;
    };

    const d1 = calcDigit(cpf.slice(0, 9), 10);
    const d2 = calcDigit(cpf.slice(0, 9) + String(d1), 11);
    return cpf.endsWith(`${d1}${d2}`);
  }

  function clearErrors() {
    setErro(null);
    setSucesso(null);
    setFieldErrors({});
  }

  async function fetchJsonNoStore(url: string) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return res.json();
  }

  async function buscarCepAuto(cepValue: string) {
    const cepDigits = onlyDigits(cepValue);
    if (cepDigits.length !== 8) return;

    try {
      setErro(null);

      let data: any;

      try {
        data = await fetchJsonNoStore(`https://viacep.com.br/ws/${cepDigits}/json/`);

        if (data?.erro) {
          toast.error("CEP não encontrado.");
          setErro("CEP não encontrado.");
          return;
        }
      } catch {
        const b = await fetchJsonNoStore(`https://brasilapi.com.br/api/cep/v1/${cepDigits}`);

        data = {
          logradouro: b?.street ?? "",
          bairro: b?.neighborhood ?? "",
          localidade: b?.city ?? "",
          uf: b?.state ?? "",
        };
      }

      setLogradouro(data.logradouro || "");
      setBairro(data.bairro || "");
      setCidade(data.localidade || "");
      setUf(data.uf || "");

      toast.success("CEP preenchido automaticamente.");
    } catch (err) {
      console.error(err);
      toastErro(
        err,
        "Serviço de CEP indisponível. Digite o endereço manualmente ou tente novamente."
      );
    }
  }

  function validarFormulario(): boolean {
    const errors: FieldErrors = {};

    if (!nomeCompleto.trim()) errors.nomeCompleto = "Informe o nome completo.";
    if (!dataNascimento) errors.dataNascimento = "Informe a data de nascimento.";

    const cpfDigits = onlyDigits(cpf);
    if (!cpfDigits) errors.cpf = "Informe o CPF.";
    else if (!isValidCPF(cpfDigits)) errors.cpf = "CPF inválido.";

    if (!logradouro.trim()) errors.logradouro = "Informe o logradouro.";
    if (!numero.trim()) errors.numero = "Informe o número.";
    if (!bairro.trim()) errors.bairro = "Informe o bairro.";
    if (!cidade.trim()) errors.cidade = "Informe a cidade.";
    if (!uf.trim()) errors.uf = "Informe a UF.";

    const cel = onlyDigits(telefoneCelular);
    if (!cel) errors.telefoneCelular = "Informe o telefone celular.";
    else if (cel.length < 10) errors.telefoneCelular = "Telefone inválido.";

    if (!cargoEclesiastico.trim()) {
      errors.cargoEclesiastico = "Selecione o cargo eclesiástico.";
    }

    if (!isStatusValido(status)) errors.status = "Selecione a situação (status).";

    if (numeroRol.trim()) {
      const n = Number(onlyDigits(numeroRol));
      if (!Number.isFinite(n) || n <= 0) errors.numeroRol = "Nº do rol inválido.";
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      const msg = "Revise os campos destacados antes de salvar.";
      setErro(msg);
      toast.error(msg);
      return false;
    }

    return true;
  }

  async function handleUploadFoto(file: File) {
    if (!allowCreateMembers) {
      const msg = demoMode
        ? "Modo demonstração: upload de foto desabilitado para esta conta."
        : "Você não tem permissão para cadastrar membros.";
      setErro(msg);
      toast.error(msg);
      return;
    }

    await runAction({
      busySetter: setUploadingFoto,
      fn: async () => {
        setErro(null);
        setSucesso(null);

        const result = await uploadImageToCloudinary(file);
        const url =
          typeof result === "string"
            ? result
            : (result as any)?.secure_url ?? (result as any)?.url ?? "";

        if (!url) throw new Error("Não foi possível obter a URL da foto após o upload.");

        setFotoUrl(String(url).trim());
      },
      success: "Foto atualizada. Não esqueça de salvar.",
      errorFallback: "Erro ao enviar foto.",
    });
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    clearErrors();

    if (uploadingFoto) {
      const msg = "Aguarde terminar o envio da foto antes de salvar.";
      setErro(msg);
      toast.error(msg);
      return;
    }

    if (loadingRole) {
      const msg = "Aguarde o carregamento das permissões do usuário.";
      setErro(msg);
      toast.error(msg);
      return;
    }

    if (!allowCreateMembers) {
      const msg = demoMode
        ? "Modo demonstração: cadastro de membro desabilitado para esta conta."
        : "Você não tem permissão para cadastrar membros.";
      setErro(msg);
      toast.error(msg);
      return;
    }

    const ok = validarFormulario();
    if (!ok) return;

    await runAction({
      busySetter: setSaving,
      fn: async () => {
        const cpfDigits = onlyDigits(cpf);
        const now = new Date().toISOString();

        if (!isStatusValido(status)) {
          setFieldErrors((p) => ({ ...p, status: "Selecione a situação (status)." }));
          throw new Error("Revise os campos destacados antes de salvar.");
        }

        const statusSeguro: Status = status;
        const nomeSeguro = normalizeNomeCompleto(nomeCompleto);

        const payload = buildMembroPayload({
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
});

        const vr = cleanMembroPayload(payload);

        if (!vr.ok) {
          throw new Error(vr.message || "Revise os campos antes de salvar.");
        }

        const c = vr.value;

        const payloadSeguro: Membro = {
          ...payload,

          nomeCompleto: c.nomeCompleto ?? payload.nomeCompleto,
          status: (c.status as any) ?? payload.status,

          telefoneCelular: c.telefoneCelular ?? payload.telefoneCelular,
          email: c.email ?? payload.email,

          cpf: c.cpf ?? payload.cpf,
          rg: c.rg ?? payload.rg,

          dataNascimento: c.dataNascimento ?? payload.dataNascimento,
          dataBatismo: c.dataBatismo ?? payload.dataBatismo,

          congregacao: c.congregacao ?? payload.congregacao,
          pastor: c.pastor ?? payload.pastor,
          campo: c.campo ?? payload.campo,

          cargoEclesiastico: c.cargoEclesiastico ?? payload.cargoEclesiastico,

          numeroRol: c.numeroRol ?? payload.numeroRol,

          telCarta: (c.telCarta as any) ?? payload.telCarta,
          fotoUrl: (c.fotoUrl as any) ?? payload.fotoUrl,
        };

const result = await createMembro({
  payload: payloadSeguro,
  paths,
  userRole,
});

  

        toastOk("Membro cadastrado com sucesso! Abrindo ficha…");
        setTimeout(() => router.push(`/membros/${result.id}`), 650);
      },
      errorFallback: "Erro ao salvar.",
    });
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-gray-100 p-4 md:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-blue-700">
                Cadastrar membro
              </h1>
              <p className="text-gray-600 mt-1">
                Preencha os dados abaixo para criar o cadastro.
              </p>
            </div>

            <Link
              href="/membros"
              className={`rounded-xl bg-white px-4 py-2 shadow hover:bg-gray-50 ${
                isBusy ? "pointer-events-none opacity-60" : ""
              }`}
            >
              ← Voltar
            </Link>
          </div>

          {demoMode ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
              <strong>Modo demonstração:</strong> cadastro de membros desabilitado para
              esta conta.
            </div>
          ) : null}

          {!loadingRole && !demoMode && !allowCreateMembers ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
              Você não tem permissão para cadastrar membros.
            </div>
          ) : null}

          <form onSubmit={salvar} className="mt-6 space-y-5">
            {sucesso ? (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-green-800">
                {sucesso}
              </div>
            ) : null}

            {erro ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
                {erro}
              </div>
            ) : null}

            <Card title="Santa Ceia e Planilhas">
              <Row>
                <Field label="Nº do rol" error={fieldErrors.numeroRol}>
                  <input
                    value={numeroRol}
                    onChange={(e) => setNumeroRol(e.target.value)}
                    className={inputClass(!!fieldErrors.numeroRol)}
                    inputMode="numeric"
                    placeholder="Ex.: 391"
                    disabled={formDisabled}
                  />
                </Field>

                <Field label="IPDA / Pastor">
                  <select
                    value={ipdaPastor}
                    onChange={(e) => setIpdaPastor(e.target.value)}
                    className={inputClass(false)}
                    disabled={formDisabled}
                  >
                    {IPDA_PASTOR_OPCOES.map((o) => (
                      <option key={o} value={o}>
                        {o === "" ? "—" : o}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Tel. ou Carta">
                  <select
                    value={telCarta}
                    onChange={(e) => setTelCarta(e.target.value as TelCarta)}
                    className={inputClass(false)}
                    disabled={formDisabled}
                  >
                    <option value="">—</option>
                    <option value="Tel.">Tel.</option>
                    <option value="Carta">Carta</option>
                  </select>
                </Field>
              </Row>
            </Card>

            <Card title="Identificação">
              <Row>
                <Field label="Nome completo *" error={fieldErrors.nomeCompleto}>
                  <input
                    value={nomeCompleto}
                    onChange={(e) => setNomeCompleto(e.target.value)}
                    className={inputClass(!!fieldErrors.nomeCompleto)}
                    disabled={formDisabled}
                  />
                </Field>

                <Field label="Data de nascimento *" error={fieldErrors.dataNascimento}>
                  <input
                    type="date"
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                    className={inputClass(!!fieldErrors.dataNascimento)}
                    disabled={formDisabled}
                  />
                  <p className="mt-2 text-xs text-gray-600">
                    Idade (automática):{" "}
                    <span className="font-semibold">{idadeTxt || "—"}</span>
                  </p>
                </Field>

                <Field label="CPF *" error={fieldErrors.cpf}>
                  <input
                    value={cpf}
                    onChange={(e) => setCpf(maskCPF(e.target.value))}
                    className={inputClass(!!fieldErrors.cpf)}
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    disabled={formDisabled}
                  />
                </Field>
              </Row>

              <Row>
                <Field label="RG">
                  <input
                    value={rg}
                    onChange={(e) => setRg(e.target.value)}
                    className={inputClass(false)}
                    disabled={formDisabled}
                  />
                </Field>

                <Field label="Estado civil">
                  <select
                    value={estadoCivil}
                    onChange={(e) => setEstadoCivil(e.target.value as EstadoCivil)}
                    className={inputClass(false)}
                    disabled={formDisabled}
                  >
                    <option>Solteiro(a)</option>
                    <option>Casado(a)</option>
                    <option>União estável</option>
                    <option>Divorciado(a)</option>
                    <option>Viúvo(a)</option>
                  </select>
                </Field>

                <Field label="Nome do cônjuge">
                  <input
                    value={nomeConjuge}
                    onChange={(e) => setNomeConjuge(e.target.value)}
                    className={inputClass(false)}
                    disabled={formDisabled}
                  />
                </Field>
              </Row>
            </Card>

            <Card title="Contato">
              <Row>
                <Field label="Telefone celular *" error={fieldErrors.telefoneCelular}>
                  <input
                    value={telefoneCelular}
                    onChange={(e) => setTelefoneCelular(maskPhone(e.target.value))}
                    className={inputClass(!!fieldErrors.telefoneCelular)}
                    inputMode="numeric"
                    placeholder="(21) 90000-0000"
                    disabled={formDisabled}
                  />
                </Field>

                <Field label="Telefone residencial">
                  <input
                    value={telefoneResidencial}
                    onChange={(e) => setTelefoneResidencial(maskPhone(e.target.value))}
                    className={inputClass(false)}
                    inputMode="numeric"
                    placeholder="(21) 0000-0000"
                    disabled={formDisabled}
                  />
                </Field>

                <Field label="E-mail">
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass(false)}
                    type="email"
                    placeholder="exemplo@dominio.com"
                    disabled={formDisabled}
                  />
                </Field>
              </Row>
            </Card>

            <Card title="Endereço">
              <Row>
                <Field label="Logradouro *" error={fieldErrors.logradouro}>
                  <input
                    value={logradouro}
                    onChange={(e) => setLogradouro(e.target.value)}
                    className={inputClass(!!fieldErrors.logradouro)}
                    disabled={formDisabled}
                  />
                </Field>

                <Field label="Número *" error={fieldErrors.numero}>
                  <input
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    className={inputClass(!!fieldErrors.numero)}
                    disabled={formDisabled}
                  />
                </Field>

                <Field label="Complemento">
                  <input
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                    className={inputClass(false)}
                    disabled={formDisabled}
                  />
                </Field>
              </Row>

              <Row>
                <Field label="Lote">
                  <input
                    value={lote}
                    onChange={(e) => setLote(e.target.value)}
                    className={inputClass(false)}
                    disabled={formDisabled}
                  />
                </Field>

                <Field label="Quadra">
                  <input
                    value={quadra}
                    onChange={(e) => setQuadra(e.target.value)}
                    className={inputClass(false)}
                    disabled={formDisabled}
                  />
                </Field>

                <Field label="Bairro *" error={fieldErrors.bairro}>
                  <input
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    className={inputClass(!!fieldErrors.bairro)}
                    disabled={formDisabled}
                  />
                </Field>
              </Row>

              <Row>
                <Field label="Cidade *" error={fieldErrors.cidade}>
                  <input
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    className={inputClass(!!fieldErrors.cidade)}
                    disabled={formDisabled}
                  />
                </Field>

                <Field label="UF *" error={fieldErrors.uf}>
                  <input
                    value={uf}
                    onChange={(e) => setUf(e.target.value)}
                    className={inputClass(!!fieldErrors.uf)}
                    placeholder="Ex.: RJ"
                    disabled={formDisabled}
                  />
                </Field>

                <Field label="CEP">
                  <input
                    value={cep}
                    onChange={(e) => {
                      const v = maskCEP(e.target.value);
                      setCep(v);
                      const digits = onlyDigits(v);
                      if (digits.length === 8) buscarCepAuto(v);
                    }}
                    className={inputClass(false)}
                    inputMode="numeric"
                    placeholder="00000-000"
                    disabled={formDisabled}
                  />
                </Field>
              </Row>
            </Card>

            <Card title="Igreja">
              <Row>
                <Field label="Data de batismo">
                  <input
                    type="date"
                    value={dataBatismo}
                    onChange={(e) => setDataBatismo(e.target.value)}
                    className={inputClass(false)}
                    disabled={formDisabled}
                  />
                </Field>

                <Field label="Campo">
                  <select
                    value={campo}
                    onChange={(e) => setCampo(e.target.value)}
                    className={inputClass(false)}
                    disabled={formDisabled}
                  >
                    <option>Duque de Caxias</option>
                    <option>Rio de Janeiro</option>
                  </select>
                </Field>

                <Field label="Congregação">
                  <input
                    value={congregacao}
                    onChange={(e) => setCongregacao(e.target.value)}
                    className={inputClass(false)}
                    disabled={formDisabled}
                  />
                </Field>
              </Row>

              <Row>
                <Field label="Pastor">
                  <input
                    value={pastor}
                    onChange={(e) => setPastor(e.target.value)}
                    className={inputClass(false)}
                    disabled={formDisabled}
                  />
                </Field>

                <Field label="Cargo eclesiástico *" error={fieldErrors.cargoEclesiastico}>
                  <select
                    value={cargoEclesiastico}
                    onChange={(e) => setCargoEclesiastico(e.target.value)}
                    className={inputClass(!!fieldErrors.cargoEclesiastico)}
                    disabled={formDisabled}
                  >
                    {CARGOS.map((c) => (
                      <option key={c} value={c}>
                        {c === "" ? "Selecione…" : c}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="">
                  <div className="mt-2 text-sm text-gray-500"></div>
                </Field>
              </Row>
            </Card>

            <Card title="Dados pessoais">
              <Row>
                <Field label="Naturalidade">
                  <input
                    value={naturalidade}
                    onChange={(e) => setNaturalidade(e.target.value)}
                    className={inputClass(false)}
                    disabled={formDisabled}
                  />
                </Field>

                <Field label="Escolaridade">
                  <input
                    value={escolaridade}
                    onChange={(e) => setEscolaridade(e.target.value)}
                    className={inputClass(false)}
                    disabled={formDisabled}
                  />
                </Field>

                <Field label="Profissão">
                  <input
                    value={profissao}
                    onChange={(e) => setProfissao(e.target.value)}
                    className={inputClass(false)}
                    disabled={formDisabled}
                  />
                </Field>
              </Row>

              <Row>
                <Field label="Filhos (qtd.)">
                  <input
                    value={filhosQtd}
                    onChange={(e) => setFilhosQtd(e.target.value)}
                    className={inputClass(false)}
                    inputMode="numeric"
                    disabled={formDisabled}
                  />
                </Field>

                <Field label="Netos (qtd.)">
                  <input
                    value={netosQtd}
                    onChange={(e) => setNetosQtd(e.target.value)}
                    className={inputClass(false)}
                    inputMode="numeric"
                    disabled={formDisabled}
                  />
                </Field>

                <Field label="Situação (Status) *" error={fieldErrors.status}>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Status)}
                    className={inputClass(!!fieldErrors.status)}
                    disabled={formDisabled}
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </Field>
              </Row>
            </Card>

            <Card title="Foto">
              {fotoUrl && (
                <div className="mb-4">
                  <p className="mb-2 text-sm text-gray-600">Prévia da foto:</p>
                  <img
                    src={fotoUrl}
                    alt="Foto do membro"
                    className="h-28 rounded-xl border object-cover"
                  />
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                disabled={formDisabled}
                onChange={async (e) => {
                  const input = e.currentTarget;
                  const file = input.files?.[0];
                  input.value = "";

                  if (!file) return;
                  if (!file.type.startsWith("image/")) {
                    const msg = "Selecione uma imagem válida.";
                    setErro(msg);
                    toast.error(msg);
                    return;
                  }

                  await handleUploadFoto(file);
                }}
                className="block w-full rounded-xl border p-2"
              />

              <p className="mt-2 text-xs text-gray-500">
                {uploadingFoto ? "Enviando foto…" : "Formatos: JPG/PNG. Envio imediato."}
              </p>
            </Card>

            <Card title="Observações">
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className={textareaClass(false)}
                placeholder="Observações gerais sobre o membro…"
                disabled={formDisabled}
              />
            </Card>

            <div className="flex flex-col gap-3 md:flex-row">
              <button
                disabled={formDisabled}
                type="submit"
                className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {saving
                  ? "Salvando…"
                  : uploadingFoto
                  ? "Aguarde upload…"
                  : loadingRole
                  ? "Carregando permissões…"
                  : !allowCreateMembers
                  ? "Cadastro desabilitado"
                  : "Salvar cadastro"}
              </button>

              <Link
                href="/membros"
                className={`rounded-xl border bg-white px-6 py-3 text-center font-semibold hover:bg-gray-50 ${
                  isBusy ? "pointer-events-none opacity-60" : ""
                }`}
              >
                Cancelar
              </Link>
            </div>
          </form>
        </div>

        <style jsx>{`
          .inputBase {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid rgb(229 231 235);
            border-radius: 0.75rem;
            background: white;
            outline: none;
          }
          .inputError {
            border-color: rgb(248 113 113);
            box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.15);
          }
          .textareaBase {
            width: 100%;
            min-height: 120px;
            padding: 0.75rem;
            border: 1px solid rgb(229 231 235);
            border-radius: 0.75rem;
            background: white;
            outline: none;
          }
        `}</style>
      </main>
    </AuthGuard>
  );
}

function inputClass(isError: boolean) {
  return `inputBase ${isError ? "inputError" : ""}`;
}

function textareaClass(isError: boolean) {
  return `textareaBase ${isError ? "inputError" : ""}`;
}

function Card(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow md:p-7">
      <h2 className="text-lg font-bold text-gray-900">{props.title}</h2>
      <div className="mt-4 space-y-4">{props.children}</div>
    </div>
  );
}

function Row(props: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-3">{props.children}</div>;
}

function Field(props: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{props.label}</label>
      <div className="mt-2">{props.children}</div>
      {props.error ? <p className="mt-2 text-sm text-red-600">{props.error}</p> : null}
    </div>
  );
}