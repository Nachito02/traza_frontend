import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AppButton,
  AppCard,
  AppInput,
  NoticeBanner,
  SectionIntro,
  useAppNotifications,
} from "../../components/ui";
import { fetchBodega, updateBodega } from "../../features/bodega/api";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

export default function BodegaConfigPage() {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const { notifySuccess, notifyError } = useAppNotifications();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [cuit, setCuit] = useState("");
  const [codigo, setCodigo] = useState("");
  const [nroInscriptoInv, setNroInscriptoInv] = useState("");

  useEffect(() => {
    if (!activeBodegaId) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    fetchBodega(String(activeBodegaId))
      .then((bodega) => {
        if (!mounted) return;
        setNombre(bodega.nombre ?? "");
        setRazonSocial(bodega.razon_social ?? "");
        setCuit(bodega.cuit ?? "");
        setCodigo(bodega.codigo ?? "");
        setNroInscriptoInv(bodega.nro_inscripto_inv ?? "");
      })
      .catch((err) => {
        if (mounted) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [activeBodegaId]);

  const handleSubmit = async () => {
    if (!activeBodegaId) return;
    setSaving(true);
    try {
      const updated = await updateBodega(String(activeBodegaId), {
        nombre: nombre.trim(),
        razon_social: razonSocial.trim(),
        cuit: cuit.trim(),
        codigo: codigo.trim(),
        nro_inscripto_inv: nroInscriptoInv.trim(),
      });
      setCodigo(updated.codigo ?? "");
      notifySuccess({ title: "Datos de la bodega actualizados" });
    } catch (err) {
      notifyError({ title: "No se pudo guardar", message: getApiErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <SectionIntro
          eyebrow="Bodega"
          title="Datos de la bodega"
          description="El código corto se usa como primer segmento del código de lote interno."
        />

        {!activeBodegaId ? (
          <NoticeBanner tone="danger">Seleccioná una bodega para editar sus datos.</NoticeBanner>
        ) : (
          <AppCard as="section" tone="default" padding="lg">
            {loading ? (
              <NoticeBanner>Cargando…</NoticeBanner>
            ) : error ? (
              <NoticeBanner tone="danger">{error}</NoticeBanner>
            ) : (
              <div className="space-y-4">
                <AppInput label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
                <AppInput
                  label="Razón social"
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                />
                <AppInput label="CUIT" value={cuit} onChange={(e) => setCuit(e.target.value)} />
                <div>
                  <AppInput
                    label="Nro de inscripto INV"
                    value={nroInscriptoInv}
                    onChange={(e) => setNroInscriptoInv(e.target.value)}
                    placeholder="ej. D72177"
                  />
                  <p className="mt-1 text-xs text-[color:var(--text-ink-muted)]">
                    Rubro I del CIU — lo necesitás para poder exportar los CIU de tus lotes al INV.
                  </p>
                </div>
                <div>
                  <AppInput
                    label="Código corto"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                    placeholder="ej. SDF"
                  />
                  <p className="mt-1 text-xs text-[color:var(--text-ink-muted)]">
                    Si lo dejás vacío, se sugiere automáticamente a partir del nombre.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <AppButton variant="primary" loading={saving} onClick={() => void handleSubmit()}>
                    Guardar
                  </AppButton>
                  <Link to="/bodega">
                    <AppButton variant="ghost">Volver</AppButton>
                  </Link>
                </div>
              </div>
            )}
          </AppCard>
        )}
      </div>
    </div>
  );
}
