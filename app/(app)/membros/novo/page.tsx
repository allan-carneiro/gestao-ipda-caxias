"use client";

import React, { useMemo, useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import AuthGuard from "@/app/components/AuthGuard";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { uploadImageToCloudinary } from "@/src/lib/cloudinary";
import { useToast } from "@/app/components/ToastProvider";

// ✅ camada enterprise (não altera UI; só valida/normaliza antes de gravar)
import { cleanMembroPayload } from "@/src/lib/validators";

type EstadoCivil =
  | "Solteiro(a)"
  | "Casado(a)"
  | "Divorciado(a)"
  | "Viúvo(a)"
  | "União estável";

type Status = "Ativo" | "Inativo";

type TelCarta = "" | "Tel." | "Carta";

type Membro = {
  // identificação
  nomeCompleto?: string;
  dataNascimento?: string;
  cpf?: string;
  rg?: string;
  estadoCivil?: EstadoCivil;
  nomeConjuge?: string | null;

  // contato
  telefoneCelular?: string;
  telefoneResidencial?: string | null;
  email?: string | null;

  // endereço
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

  // igreja
  dataBatismo?: string | null;
  campo?: string;
  congregacao?: string;
  pastor?: string;
  cargoEclesiastico?: string;

  // dados pessoais
  naturalidade?: string | null;
  escolaridade?: string | null;
  profissao?: string | null;
  filhosQtd?: number | null;
  netosQtd?: number | null;

  // status/obs
  status?: Status;
  observacoes?: string | null;

  // FOTO (Cloudinary)
  fotoUrl?: string | null;

  // anexos (futuro)
  anexos?: any[];

  // ===== Campos extras p/ Ceia e planilhas =====
  numeroRol?: number | null; // Nº do rol
  ipdaPastor?: string | null; // IPDA / Pastor
  telCarta?: "Tel." | "Carta" | null; // Tel. ou Carta

  createdAt?: string;
  updatedAt?: string;
};

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

// ===== Idade (runtime) =====
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

  // dd/mm/aaaa (caso apareça em dados antigos ou colagens)
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const iso = parseBRToISO(s);
    if (!iso) return null;
    const d = new Date(`${iso}T00:00:00`);
    return isValidDate(d) ? d : null;
  }

  // yyyy-mm-dd (input type="date")
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T00:00:00`);
    return isValidDate(d) ? d : null;
  }

  // fallback
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

  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // ===== CAMPOS PARA CEIA/PLANILHA =====
  const [numeroRol, setNumeroRol] = useState<string>("");
  const [ipdaPastor, setIpdaPastor] = useState<string>("");
  const [telCarta, setTelCarta] = useState<TelCarta>("");

  // identificação
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [estadoCivil, setEstadoCivil] = useState<EstadoCivil>("Solteiro(a)");
  const [nomeConjuge, setNomeConjuge] = useState("");

  // contato
  const [telefoneCelular, setTelefoneCelular] = useState("");
  const [telefoneResidencial, setTelefoneResidencial] = useState("");
  const [email, setEmail] = useState("");

  // endereço
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [lote, setLote] = useState("");
  const [quadra, setQuadra] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [cep, setCep] = useState("");

  // igreja
  const [dataBatismo, setDataBatismo] = useState("");
  const [campo, setCampo] = useState("Duque de Caxias");
  const [congregacao, setCongregacao] = useState("");
  const [pastor, setPastor] = useState("");
  const [cargoEclesiastico, setCargoEclesiastico] = useState("");

  // dados pessoais
  const [naturalidade, setNaturalidade] = useState("");
  const [escolaridade, setEscolaridade] = useState("");
  const [profissao, setProfissao] = useState("");
  const [filhosQtd, setFilhosQtd] = useState<string>("");
  const [netosQtd, setNetosQtd] = useState<string>("");

  // ✅ status obrigatório
  const [status, setStatus] = useState<Status>("Ativo");

  const [observacoes, setObservacoes] = useState("");

  // foto/anexos
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [anexos, setAnexos] = useState<any[]>([]);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  const isBusy = saving || uploadingFoto;

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

  // ✅ idade automática no cadastro
  const idade = useMemo(() => calcularIdade(dataNascimento ?? null), [dataNascimento]);
  const idadeTxt = useMemo(() => formatarIdade(idade), [idade]);

  // ========= helpers =========
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

  // ✅ Helper para tratar HTTP e evitar "Failed to fetch" quebrando o fluxo
  async function fetchJsonNoStore(url: string) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return res.json();
  }

  // ✅ CEP: ViaCEP (principal) + BrasilAPI (fallback quando ViaCEP cair/502)
  async function buscarCepAuto(cepValue: string) {
    const cepDigits = onlyDigits(cepValue);
    if (cepDigits.length !== 8) return;

    try {
      setErro(null);

      let data: any;

      // 1) Tenta ViaCEP
      try {
        data = await fetchJsonNoStore(`https://viacep.com.br/ws/${cepDigits}/json/`);

        // ViaCEP: quando não encontra, retorna { erro: true }
        if (data?.erro) {
          toast.error("CEP não encontrado.");
          setErro("CEP não encontrado.");
          return;
        }
      } catch (e) {
        // 2) Fallback: BrasilAPI (quando ViaCEP dá 502 / cai / bloqueia / etc.)
        const b = await fetchJsonNoStore(`https://brasilapi.com.br/api/cep/v1/${cepDigits}`);

        // Normaliza para o mesmo formato que você já usa
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

  // ========= validações =========
  function validarFormulario(): boolean {
    const errors: FieldErrors = {};

    if (!nomeCompleto.trim()) errors.nomeCompleto = "Informe o nome completo.";
    if (!dataNascimento) errors.dataNascimento = "Informe a data de nascimento.";

    const cpfDigits = onlyDigits(cpf);
    if (!cpfDigits) errors.cpf = "Informe o CPF.";
    else if (!isValidCPF(cpfDigits)) errors.cpf = "CPF inválido.";

    // endereço obrigatório
    if (!logradouro.trim()) errors.logradouro = "Informe o logradouro.";
    if (!numero.trim()) errors.numero = "Informe o número.";
    if (!bairro.trim()) errors.bairro = "Informe o bairro.";
    if (!cidade.trim()) errors.cidade = "Informe a cidade.";
    if (!uf.trim()) errors.uf = "Informe a UF.";

    // telefone celular obrigatório
    const cel = onlyDigits(telefoneCelular);
    if (!cel) errors.telefoneCelular = "Informe o telefone celular.";
    else if (cel.length < 10) errors.telefoneCelular = "Telefone inválido.";

    if (!cargoEclesiastico.trim())
      errors.cargoEclesiastico = "Selecione o cargo eclesiástico.";

    if (!isStatusValido(status)) errors.status = "Selecione a situação (status).";

    // numeroRol (opcional)
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

  // ========= upload foto =========
  async function handleUploadFoto(file: File) {
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

  // ========= salvar =========
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

        const payload: Membro = {
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

          numeroRol: numeroRol.trim() ? Number(onlyDigits(numeroRol)) : null,
          ipdaPastor: ipdaPastor.trim() || null,
          telCarta: (telCarta || "").trim()
            ? (telCarta as "Tel." | "Carta")
            : null,

          createdAt: now,
          updatedAt: now,
        };

        // ✅ validação/normalização enterprise (antes de gravar)
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

        const ref = await addDoc(collection(db, "membros"), payloadSeguro as any);

        // ✅ navegação após salvar
        toastOk("Membro cadastrado com sucesso! Abrindo ficha…");
        setTimeout(() => router.push(`/membros/${ref.id}`), 650);
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

          <form onSubmit={salvar} className="mt-6 space-y-5">
            {sucesso ? (
              <div className="rounded-2xl bg-green-50 border border-green-200 p-4 text-green-800">
                {sucesso}
              </div>
            ) : null}

            {erro ? (
              <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-red-700">
                {erro}
              </div>
            ) : null}

            {/* ===== CAMPOS PARA CEIA / PLANILHA ===== */}
            <Card title="Santa Ceia e Planilhas">
              <Row>
                <Field label="Nº do rol" error={fieldErrors.numeroRol}>
                  <input
                    value={numeroRol}
                    onChange={(e) => setNumeroRol(e.target.value)}
                    className={inputClass(!!fieldErrors.numeroRol)}
                    inputMode="numeric"
                    placeholder="Ex.: 391"
                    disabled={isBusy}
                  />
                </Field>

                <Field label="IPDA / Pastor">
                  <select
                    value={ipdaPastor}
                    onChange={(e) => setIpdaPastor(e.target.value)}
                    className={inputClass(false)}
                    disabled={isBusy}
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
                    disabled={isBusy}
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
                    disabled={isBusy}
                  />
                </Field>

                <Field label="Data de nascimento *" error={fieldErrors.dataNascimento}>
                  <input
                    type="date"
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                    className={inputClass(!!fieldErrors.dataNascimento)}
                    disabled={isBusy}
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
                    disabled={isBusy}
                  />
                </Field>
              </Row>

              <Row>
                <Field label="RG">
                  <input
                    value={rg}
                    onChange={(e) => setRg(e.target.value)}
                    className={inputClass(false)}
                    disabled={isBusy}
                  />
                </Field>

                <Field label="Estado civil">
                  <select
                    value={estadoCivil}
                    onChange={(e) => setEstadoCivil(e.target.value as EstadoCivil)}
                    className={inputClass(false)}
                    disabled={isBusy}
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
                    disabled={isBusy}
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
                    disabled={isBusy}
                  />
                </Field>

                <Field label="Telefone residencial">
                  <input
                    value={telefoneResidencial}
                    onChange={(e) => setTelefoneResidencial(maskPhone(e.target.value))}
                    className={inputClass(false)}
                    inputMode="numeric"
                    placeholder="(21) 0000-0000"
                    disabled={isBusy}
                  />
                </Field>

                <Field label="E-mail">
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass(false)}
                    type="email"
                    placeholder="exemplo@dominio.com"
                    disabled={isBusy}
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
                    disabled={isBusy}
                  />
                </Field>

                <Field label="Número *" error={fieldErrors.numero}>
                  <input
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    className={inputClass(!!fieldErrors.numero)}
                    disabled={isBusy}
                  />
                </Field>

                <Field label="Complemento">
                  <input
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                    className={inputClass(false)}
                    disabled={isBusy}
                  />
                </Field>
              </Row>

              <Row>
                <Field label="Lote">
                  <input
                    value={lote}
                    onChange={(e) => setLote(e.target.value)}
                    className={inputClass(false)}
                    disabled={isBusy}
                  />
                </Field>

                <Field label="Quadra">
                  <input
                    value={quadra}
                    onChange={(e) => setQuadra(e.target.value)}
                    className={inputClass(false)}
                    disabled={isBusy}
                  />
                </Field>

                <Field label="Bairro *" error={fieldErrors.bairro}>
                  <input
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    className={inputClass(!!fieldErrors.bairro)}
                    disabled={isBusy}
                  />
                </Field>
              </Row>

              <Row>
                <Field label="Cidade *" error={fieldErrors.cidade}>
                  <input
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    className={inputClass(!!fieldErrors.cidade)}
                    disabled={isBusy}
                  />
                </Field>

                <Field label="UF *" error={fieldErrors.uf}>
                  <input
                    value={uf}
                    onChange={(e) => setUf(e.target.value)}
                    className={inputClass(!!fieldErrors.uf)}
                    placeholder="Ex.: RJ"
                    disabled={isBusy}
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
                    disabled={isBusy}
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
                    disabled={isBusy}
                  />
                </Field>

                <Field label="Campo">
                  <select
                    value={campo}
                    onChange={(e) => setCampo(e.target.value)}
                    className={inputClass(false)}
                    disabled={isBusy}
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
                    disabled={isBusy}
                  />
                </Field>
              </Row>

              <Row>
                <Field label="Pastor">
                  <input
                    value={pastor}
                    onChange={(e) => setPastor(e.target.value)}
                    className={inputClass(false)}
                    disabled={isBusy}
                  />
                </Field>

                <Field label="Cargo eclesiástico *" error={fieldErrors.cargoEclesiastico}>
                  <select
                    value={cargoEclesiastico}
                    onChange={(e) => setCargoEclesiastico(e.target.value)}
                    className={inputClass(!!fieldErrors.cargoEclesiastico)}
                    disabled={isBusy}
                  >
                    {CARGOS.map((c) => (
                      <option key={c} value={c}>
                        {c === "" ? "Selecione…" : c}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="">
                  <div className="text-sm text-gray-500 mt-2">{/* espaço */}</div>
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
                    disabled={isBusy}
                  />
                </Field>

                <Field label="Escolaridade">
                  <input
                    value={escolaridade}
                    onChange={(e) => setEscolaridade(e.target.value)}
                    className={inputClass(false)}
                    disabled={isBusy}
                  />
                </Field>

                <Field label="Profissão">
                  <input
                    value={profissao}
                    onChange={(e) => setProfissao(e.target.value)}
                    className={inputClass(false)}
                    disabled={isBusy}
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
                    disabled={isBusy}
                  />
                </Field>

                <Field label="Netos (qtd.)">
                  <input
                    value={netosQtd}
                    onChange={(e) => setNetosQtd(e.target.value)}
                    className={inputClass(false)}
                    inputMode="numeric"
                    disabled={isBusy}
                  />
                </Field>

                <Field label="Situação (Status) *" error={fieldErrors.status}>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Status)}
                    className={inputClass(!!fieldErrors.status)}
                    disabled={isBusy}
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
                  <p className="text-sm text-gray-600 mb-2">Prévia da foto:</p>
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
                disabled={uploadingFoto || saving}
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
                className="block w-full border rounded-xl p-2"
              />

              <p className="text-xs text-gray-500 mt-2">
                {uploadingFoto ? "Enviando foto…" : "Formatos: JPG/PNG. Envio imediato."}
              </p>
            </Card>

            <Card title="Observações">
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className={textareaClass(false)}
                placeholder="Observações gerais sobre o membro…"
                disabled={isBusy}
              />
            </Card>

            <div className="flex flex-col md:flex-row gap-3">
              <button
                disabled={saving || uploadingFoto}
                type="submit"
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {saving ? "Salvando…" : uploadingFoto ? "Aguarde upload…" : "Salvar cadastro"}
              </button>

              <Link
                href="/membros"
                className={`bg-white border px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 text-center ${
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
    <div className="bg-white rounded-3xl shadow p-5 md:p-7">
      <h2 className="text-lg font-bold text-gray-900">{props.title}</h2>
      <div className="mt-4 space-y-4">{props.children}</div>
    </div>
  );
}

function Row(props: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{props.children}</div>;
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