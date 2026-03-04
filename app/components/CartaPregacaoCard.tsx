"use client";

import { useMemo, useState } from "react";

const CARTA_URL = "https://bit.ly/cartapregacao";

function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export default function CartaPregacaoCard() {
  const [destino, setDestino] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const msg = useMemo(() => {
    return `Paz do Senhor! Segue o link para preencher a Carta de Pregação:\n\n${CARTA_URL}\n\nApós preencher, envie. Deus abençoe!`;
  }, []);

  // Email/telefone
  const destinoTrim = destino.trim();
  const destinoIsEmail = isEmail(destinoTrim);

  // Aceita "21..." e adiciona 55 automaticamente
  const digitsRaw = onlyDigits(destinoTrim);
  const digitsBR = digitsRaw.startsWith("55") ? digitsRaw : `55${digitsRaw}`;

  // válido se tiver pelo menos DDD + número (10 ou 11 dígitos sem 55)
  const destinoIsPhone = digitsRaw.length >= 10;

  // WhatsApp Web (melhor no PC)
  const whatsappWebHref = useMemo(() => {
    const text = encodeURIComponent(msg);
    return `https://web.whatsapp.com/send?phone=${digitsBR}&text=${text}`;
  }, [digitsBR, msg]);

  // Tenta abrir app / ou cai na página do WhatsApp
  const whatsappHref = useMemo(() => {
    const text = encodeURIComponent(msg);
    return `https://wa.me/${digitsBR}?text=${text}`;
  }, [digitsBR, msg]);

  async function copy(
    text: string,
    setFlag: (v: boolean) => void,
    fallbackLabel = "Copie:"
  ) {
    try {
      await navigator.clipboard.writeText(text);
      setFlag(true);
      setTimeout(() => setFlag(false), 1200);
    } catch {
      window.prompt(fallbackLabel, text);
    }
  }

  return (
    <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl p-6 shadow">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">📄 Carta de Pregação</h3>
          <p className="text-sm text-gray-600 mt-1">
            Compartilhe o link para o obreiro preencher e enviar para a secretaria.
          </p>
        </div>

        <a
          href={CARTA_URL}
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
        >
          Abrir formulário
        </a>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {/* Linha 1: copiar link + destino */}
        <div className="flex flex-col md:flex-row gap-3">
          <button
            onClick={() => copy(CARTA_URL, setCopiedLink, "Copie o link:")}
            className="px-4 py-2 rounded-xl bg-gray-900 text-white font-medium hover:bg-black transition"
          >
            {copiedLink ? "✅ Link copiado!" : "Copiar link"}
          </button>

          <input
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            placeholder="Digite e-mail ou WhatsApp (ex: 21999999999)"
            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* Linha 2: copiar mensagem + ações */}
        <div className="flex flex-col md:flex-row gap-3">
          <button
            onClick={() => copy(msg, setCopiedMsg, "Copie a mensagem:")}
            className="px-4 py-2 rounded-xl bg-slate-700 text-white font-medium hover:bg-slate-800 transition"
          >
            {copiedMsg ? "✅ Mensagem copiada!" : "Copiar mensagem"}
          </button>

          {/* Se for e-mail, mostra "Copiar e-mail" (não depende de mailto) */}
          {destinoIsEmail && (
            <button
              onClick={() => copy(destinoTrim, setCopiedEmail, "Copie o e-mail:")}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition"
            >
              {copiedEmail ? "✅ E-mail copiado!" : "Copiar e-mail"}
            </button>
          )}

          {/* WhatsApp Web (melhor no PC) */}
          <a
            href={destinoIsPhone ? whatsappWebHref : "#"}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => {
              if (!destinoIsPhone) e.preventDefault();
            }}
            className={`px-4 py-2 rounded-xl font-medium transition text-center ${
              destinoIsPhone
                ? "bg-green-700 text-white hover:bg-green-800"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            WhatsApp Web
          </a>

          {/* Alternativa: tentar abrir app */}
          <a
            href={destinoIsPhone ? whatsappHref : "#"}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => {
              if (!destinoIsPhone) e.preventDefault();
            }}
            className={`px-4 py-2 rounded-xl font-medium transition text-center ${
              destinoIsPhone
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            Abrir WhatsApp
          </a>
        </div>

        <p className="text-xs text-gray-500">
          WhatsApp: digite <b>DDD + número</b> (ex: <b>21999999999</b>). O sistema adiciona o 55 automaticamente.
          {destinoIsEmail && (
            <>
              {" "}Para e-mail: use <b>Copiar e-mail</b> e <b>Copiar mensagem</b> e cole no seu Gmail/Yahoo.
            </>
          )}
        </p>
      </div>
    </div>
  );
}