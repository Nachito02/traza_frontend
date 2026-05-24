import { useCallback, useRef, useState } from "react";
import AppButton from "./AppButton";
import AppModal from "./AppModal";

type ConfirmState = {
  opened: boolean;
  message: string;
  resolve: (value: boolean) => void;
};

/**
 * Drop-in replacement for window.confirm().
 *
 * Usage:
 *   const { confirm, ConfirmDialog } = useConfirmDialog();
 *
 *   // In handler (must be async):
 *   const ok = await confirm("¿Eliminar este elemento?");
 *   if (!ok) return;
 *
 *   // In JSX:
 *   return <>{...}{ConfirmDialog}</>;
 */
export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmState | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ opened: true, message, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true);
    resolveRef.current = null;
    setState(null);
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    resolveRef.current = null;
    setState(null);
  }, []);

  const ConfirmDialog = (
    <AppModal
      opened={state?.opened ?? false}
      onClose={handleCancel}
      size="sm"
      closeOnOverlayClick={false}
      closeOnEscape={true}
      showFooterDivider={true}
      zIndex={400}
      footer={
        <div className="flex justify-end gap-2">
          <AppButton type="button" variant="secondary" size="sm" onClick={handleCancel}>
            Cancelar
          </AppButton>
          <AppButton type="button" variant="danger" size="sm" onClick={handleConfirm}>
            Confirmar
          </AppButton>
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-[color:var(--text-ink)]">
        {state?.message}
      </p>
    </AppModal>
  );

  return { confirm, ConfirmDialog };
}
