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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl text-[#3D1B1F] mb-4">Adjuntar Evidencia</h2>
        <p className="text-sm text-[#7A4A50] mb-4">
          Subir archivo para el hito: {milestone.protocolo_proceso.nombre}
        </p>

        <div className="mb-6">
          <input
            type="file"
            onChange={(e) => onFileChange(e.target.files?.[0] || null)}
            className="w-full text-sm text-slate-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-[#F8F3EE] file:text-[#722F37]
            hover:file:bg-[#F3E7DA]
            "
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-[#C9A961]/40 px-4 py-2 text-sm font-semibold text-[#722F37] transition hover:border-[#C9A961] hover:bg-[#F8F3EE]"
          >
            Cancelar
          </button>
          <button
            onClick={() => void onUpload()}
            disabled={!fileToUpload || uploading}
            className="rounded-lg bg-[#722F37] text-white px-4 py-2 text-sm font-semibold transition hover:bg-[#5E252D] disabled:opacity-50"
          >
            {uploading ? "Subiendo..." : "Subir archivo"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
