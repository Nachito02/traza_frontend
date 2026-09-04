import { useCallback, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { AppButton, AppModal } from "../../../components/ui";

type QrEnvaseModalProps = {
  opened: boolean;
  onClose: () => void;
  codigoQr: string;
  productoLabel?: string;
};

function getPublicUrl(codigoQr: string): string {
  const base = window.location.origin;
  return `${base}/producto/${encodeURIComponent(codigoQr)}`;
}

/** QR listo para imprimir en la etiqueta — mismo patrón que QrCuartelModal, pero apuntando al producto. */
export default function QrEnvaseModal({ opened, onClose, codigoQr, productoLabel }: QrEnvaseModalProps) {
  const url = getPublicUrl(codigoQr);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const handleDownloadSVG = useCallback(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgEl);
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `qr-producto-${codigoQr.toLowerCase()}.svg`;
    a.click();
    URL.revokeObjectURL(blobUrl);
  }, [codigoQr]);

  const handleDownloadPNG = useCallback(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const SIZE = 512;
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, SIZE, SIZE);

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgEl);
    const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, SIZE, SIZE);
      URL.revokeObjectURL(svgUrl);
      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = `qr-producto-${codigoQr.toLowerCase()}.png`;
      a.click();
    };
    img.src = svgUrl;
  }, [codigoQr]);

  const handleCopyUrl = useCallback(() => {
    void navigator.clipboard.writeText(url);
  }, [url]);

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      size="sm"
      title="QR del producto"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <AppButton type="button" variant="secondary" size="sm" onClick={handleDownloadSVG}>
            Descargar SVG
          </AppButton>
          <AppButton type="button" variant="primary" size="sm" onClick={handleDownloadPNG}>
            Descargar PNG
          </AppButton>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-5 py-2">
        <div className="rounded-[var(--radius-xl)] border border-[color:var(--border-shell)] bg-white p-5 shadow-[var(--shadow-soft)]">
          <QRCodeSVG
            ref={svgRef}
            value={url}
            size={220}
            bgColor="#ffffff"
            fgColor="#07135f"
            level="M"
            marginSize={1}
          />
        </div>

        <div className="w-full text-center space-y-1">
          <div className="text-sm font-semibold text-[color:var(--text-ink)]">
            {productoLabel ?? "Código de envase"}
          </div>
          <div className="text-xs text-[color:var(--text-ink-muted)]">
            Este es el QR para imprimir en la etiqueta — al escanearlo se ve la trazabilidad del producto.
          </div>
        </div>

        <div className="w-full rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-3 py-2.5">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-ink-muted)]">
            URL pública
          </div>
          <div className="flex items-center gap-2">
            <span className="flex-1 truncate text-xs text-[color:var(--text-ink)] font-mono">
              {url}
            </span>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="shrink-0 rounded-[var(--radius-sm)] border border-[color:var(--border-shell)] bg-[color:var(--action-secondary-bg)] px-2 py-1 text-[11px] font-semibold text-[color:var(--text-on-dark)] transition hover:border-[color:var(--border-default)] hover:bg-[color:var(--action-secondary-hover)]"
            >
              Copiar
            </button>
          </div>
        </div>
      </div>
    </AppModal>
  );
}
