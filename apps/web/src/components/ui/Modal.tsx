import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
  confirmVariant?: 'primary' | 'danger';
  children?: React.ReactNode;
}

export default function Modal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  confirmVariant = 'primary',
  children,
}: ModalProps) {
  const { t } = useTranslation();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const confirmStyles =
    confirmVariant === 'danger'
      ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
      : 'bg-violet-600 text-white hover:bg-violet-500';

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#0c0c0e] border border-white/[0.08] rounded-xl shadow-2xl animate-slide-up">
        {children ? (
          children
        ) : (
          <div className="p-6">
            <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
            {description && (
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{description}</p>
            )}
            <div className="flex justify-end gap-2 mt-6">
              <button
                ref={cancelRef}
                onClick={onClose}
                className="px-4 py-2 text-sm text-zinc-400 bg-white/[0.04] border border-white/[0.08] rounded-lg hover:bg-white/[0.08] transition-colors"
              >
                {t('modal.cancel')}
              </button>
              <button
                onClick={onConfirm}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${confirmStyles}`}
              >
                {confirmText || t('common.confirm')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
