import React from "react";

export function inputClass(isError: boolean) {
  return `inputBase ${isError ? "inputError" : ""}`;
}

export function textareaClass(isError: boolean) {
  return `textareaBase ${isError ? "inputError" : ""}`;
}

export function Card(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl shadow p-5 md:p-7">
      <h2 className="text-lg font-bold text-gray-900">{props.title}</h2>
      <div className="mt-4 space-y-4">{props.children}</div>
    </div>
  );
}

export function Row(props: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {props.children}
    </div>
  );
}

export function Field(props: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        {props.label}
      </label>

      <div className="mt-2">{props.children}</div>

      {props.error ? (
        <p className="mt-2 text-sm text-red-600">{props.error}</p>
      ) : null}
    </div>
  );
}