import { AppButton, AppInput, AppModal } from "../../../components/ui";
import type { Milestone } from "../../../features/milestones/api";

type Props = {
  milestone: Milestone;
  fileToUpload: File | null;
  uploading: boolean;
  onFileChange: (file: File | null) => void;
  onUpload: () => void;
  onClose: () => void;
};

const UploadModal = ({
  milestone,
  fileToUpload,
  uploading,
  onFileChange,
  onUpload,
  onClose,
}: Props) => {
  return (
    <AppModal
      opened
      onClose={onClose}
      title="Adjuntar Evidencia"
      description={`Subir archivo para el hito: ${milestone.protocolo_proceso.nombre}`}
      size="sm"
      footer={(
        <div className="flex justify-end gap-3">
          <AppButton onClick={onClose} variant="secondary">
            Cancelar
          </AppButton>
          <AppButton
            onClick={() => void onUpload()}
            disabled={!fileToUpload || uploading}
            loading={uploading}
            variant="primary"
          >
            {uploading ? "Subiendo..." : "Subir archivo"}
          </AppButton>
        </div>
      )}
    >
      <div className="space-y-4">
        <AppInput
          type="file"
          onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          inputClassName="file:mr-4 file:rounded-full file:border-0 file:bg-[color:var(--action-ghost-bg)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[color:var(--text-accent)] hover:file:bg-[color:var(--action-ghost-hover)]"
        />

        {fileToUpload ? (
          <div className="rounded-[var(--radius-lg)] border border-[color:var(--border-default)] bg-[color:var(--surface-soft)] px-3 py-2 text-sm text-[color:var(--text-ink)]">
            Archivo seleccionado: <span className="font-semibold">{fileToUpload.name}</span>
          </div>
        ) : null}
      </div>
    </AppModal>
  );
};

export default UploadModal;
