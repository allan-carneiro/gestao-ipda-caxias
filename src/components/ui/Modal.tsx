'use client';

import { useEffect, useRef } from 'react';

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidthClassName?: string;
};

export function Modal({
  open,
  title,
  onClose,
  children,
  maxWidthClassName = 'max-w-3xl',
}: ModalProps) {
  const ref = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    const handler = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    dialog.addEventListener('cancel', handler);
    return () => dialog.removeEventListener('cancel', handler);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      className="w-full rounded-xl p-0 backdrop:bg-black/50"
      onClose={onClose}
    >
      <div className={`w-full bg-white ${maxWidthClassName}`}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">{title}</h2>

          <button
            onClick={onClose}
            className="px-2 py-1 rounded hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className="p-4">{children}</div>
      </div>
    </dialog>
  );
}