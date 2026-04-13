import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createCampania,
  fetchCampanias,
  type Campania,
} from "../../features/campanias/api";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { useCampaniaStore } from "../../store/campaniaStore";
import {
  AppButton,
  AppCard,
  AppInput,
  AppSelect,
  NoticeBanner,
  SectionIntro,
} from "../../components/ui";

const SetupCampania = () => {
  const navigate = useNavigate();
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const setActiveCampania = useCampaniaStore((state) => state.setActiveCampania);
  const loadCampanias = useCampaniaStore((state) => state.loadCampanias);
  const [mode, setMode] = useState<"active" | "existing" | "new">("active");
  const [campanias, setCampanias] = useState<Campania[]>([]);
  const [activeCampania, setActiveCampaniaLocal] = useState<Campania | null>(null);
  const [selectedCampaniaId, setSelectedCampaniaId] = useState("");
  const [loadingCampanias, setLoadingCampanias] = useState(true);
  const [form, setForm] = useState({
    nombre: "",
    fecha_inicio: "",
    fecha_fin: "",
    estado: "abierta",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    let mounted = true;
    setLoadingCampanias(true);
    fetchCampanias(activeBodegaId ?? undefined)
      .then((data) => {
        if (!mounted) return;
        const loaded = data ?? [];
        setCampanias(loaded);
        const active = loaded.find((c) => c.estado === "abierta") ?? null;
        setActiveCampaniaLocal(active);
        if (active) {
          const activeId = String(active.campania_id ?? active.id ?? "");
          setSelectedCampaniaId(activeId);
          setMode("active");
        } else {
          const firstId = String(loaded[0]?.campania_id ?? loaded[0]?.id ?? "");
          if (firstId) setSelectedCampaniaId(firstId);
          setMode(loaded.length > 0 ? "existing" : "new");
        }
      })
      .catch(() => {
        if (!mounted) return;
        setCampanias([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingCampanias(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeBodegaId]);

  const validateDates = () => {
    if (!form.fecha_inicio || !form.fecha_fin) return true;
    return new Date(form.fecha_fin) > new Date(form.fecha_inicio);
  };

  const canUseExisting = useMemo(
    () =>
      !loadingCampanias &&
      campanias.length > 0 &&
      Boolean(selectedCampaniaId),
    [campanias.length, loadingCampanias, selectedCampaniaId],
  );

  const handleSubmit = async () => {
    if (!form.nombre.trim()) {
      setError("El nombre de la campaña es obligatorio.");
      return;
    }
    if (!form.fecha_inicio || !form.fecha_fin) {
      setError("Fecha inicio y fin son obligatorias.");
      return;
    }
    if (!validateDates()) {
      setError("La fecha fin debe ser posterior a la fecha inicio.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await createCampania({
        bodegaId: String(activeBodegaId ?? ""),
        nombre: form.nombre.trim(),
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        estado: "abierta",
      });
      const createdCampaniaId = String(created.campania_id ?? created.id ?? "");
      if (createdCampaniaId) {
        setActiveCampania(
          createdCampaniaId,
          created.nombre ?? form.nombre.trim() ?? createdCampaniaId,
        );
        if (activeBodegaId) {
          await loadCampanias(activeBodegaId);
        }
      }
      navigate("/admin/campanias");
    } catch (e) {
      const message = getApiErrorMessage(e);
      if (message.toLowerCase().includes("unique")) {
        setError("Ya existe una campaña con ese nombre. Elegí otro nombre.");
      } else {
      setError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleContinueWithExisting = () => {
    if (!selectedCampaniaId) {
      setError("Seleccioná una campaña existente.");
      return;
    }
    const selected = campanias.find(
      (item) => String(item.campania_id ?? item.id) === selectedCampaniaId,
    );
    if (selected) {
      setActiveCampania(selectedCampaniaId, selected.nombre ?? selectedCampaniaId);
    }
    navigate("/admin/campanias");
  };

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <AppCard
          as="section"
          tone="default"
          padding="lg"
          header={(
            <SectionIntro
              title="Campaña"
              description="Definí la campaña activa o reutilizá una existente para seguir con el setup productivo."
            />
          )}
        >
          <NoticeBanner tone="info" title="Flujo">
            Campaña activa - Cuarteles - Protocolo - Trazabilidad
          </NoticeBanner>
        </AppCard>

        {!activeBodegaId ? (
          <NoticeBanner tone="danger">
            Seleccioná una bodega activa para crear o usar campañas.
          </NoticeBanner>
        ) : null}

        {loadingCampanias ? (
          <NoticeBanner tone="info">Cargando campañas…</NoticeBanner>
        ) : mode === "active" && activeCampania ? (
          <AppCard as="section" tone="default" padding="lg">
            <div className="space-y-4">
            <NoticeBanner tone="success">
              Campaña activa: <strong>{activeCampania.nombre}</strong>
            </NoticeBanner>
            <div className="flex flex-wrap gap-3">
              <AppButton
                type="button"
                variant="primary"
                disabled={!activeBodegaId}
                onClick={handleContinueWithExisting}
              >
                Continuar con esta campaña
              </AppButton>
              <AppButton
                type="button"
                variant="secondary"
                onClick={() => { setMode("new"); setError(null); }}
              >
                Crear nueva campaña
              </AppButton>
            </div>
          </div>
          </AppCard>
        ) : mode === "existing" && campanias.length > 0 ? (
          <AppCard as="section" tone="default" padding="lg">
            <div className="space-y-4">
              <AppSelect
                label="Campaña existente"
                value={selectedCampaniaId}
                onChange={(e) => setSelectedCampaniaId(e.target.value)}
              >
                {campanias.map((campania) => {
                  const id = String(campania.campania_id ?? campania.id ?? "");
                  return (
                    <option key={id} value={id}>
                      {campania.nombre}
                    </option>
                  );
                })}
              </AppSelect>
            <div className="flex flex-wrap gap-3">
              <AppButton
                type="button"
                variant="primary"
                disabled={!canUseExisting || !activeBodegaId}
                onClick={handleContinueWithExisting}
              >
                Continuar con campaña seleccionada
              </AppButton>
              <AppButton
                type="button"
                variant="secondary"
                onClick={() => { setMode("new"); setError(null); }}
              >
                Crear nueva campaña
              </AppButton>
            </div>
          </div>
          </AppCard>
        ) : (
          <AppCard as="section" tone="default" padding="lg">
          <form className="space-y-4">
            <AppInput
              label="Nombre de la campaña"
                type="text"
                uiSize="lg"
                placeholder="Campaña 2025"
                value={form.nombre}
                onChange={(e) => onChange("nombre", e.target.value)}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <AppInput
                label="Fecha inicio"
                  type="date"
                  uiSize="lg"
                  value={form.fecha_inicio}
                  onChange={(e) => onChange("fecha_inicio", e.target.value)}
              />
              <AppInput
                label="Fecha fin"
                  type="date"
                  uiSize="lg"
                  value={form.fecha_fin}
                  onChange={(e) => onChange("fecha_fin", e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <AppButton
                type="button"
                variant="primary"
                disabled={saving || !activeBodegaId}
                loading={saving}
                onClick={() => void handleSubmit()}
              >
                {saving ? "Guardando..." : "Crear campaña"}
              </AppButton>
              <AppButton
                type="button"
                variant="secondary"
                onClick={() => navigate("/admin/campanias")}
              >
                Omitir
              </AppButton>
            </div>
          </form>
          </AppCard>
        )}

        {error ? <NoticeBanner tone="danger">{error}</NoticeBanner> : null}
      </div>
    </div>
  );
};

export default SetupCampania;
