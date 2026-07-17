import { useEffect, useMemo, useState } from "react";
import { listElaboracionResource, type ElaboracionEntity } from "../../features/elaboracion/api";
import { VASIJA_FIELDS, OPERACION_TIPOS } from "../../features/elaboracion/vasijaFields";
import { useAuthStore } from "../../store/authStore";
import { AppCard, SectionIntro } from "../../components/ui";
import GenericCrudSection, { type SelectOption } from "./components/GenericCrudSection";
import SectionSelector from "./components/SectionSelector";
import { useSearchParams } from "react-router-dom";
import { fetchAuthUsers, type AuthUser } from "../../features/users/api";


function toOptions(items: ElaboracionEntity[], idKeys: string[], labelKeys: string[]): SelectOption[] {
  return items
    .map((item) => {
      const id = idKeys
        .map((key) => item[key])
        .find((value) => typeof value === "string" || typeof value === "number");
      const label = labelKeys
        .map((key) => item[key])
        .find((value) => typeof value === "string" || typeof value === "number");
      if (id === undefined || id === null) return null;
      return {
        value: String(id),
        label: String(label ?? id),
      };
    })
    .filter((option): option is SelectOption => option !== null);
}

function formatRecepcionOption(item: ElaboracionEntity): SelectOption | null {
  const id = item.recepcion_bodega_id ?? item.id_recepcion ?? item.recepcion_id ?? item.id;
  if (typeof id !== "string" && typeof id !== "number") return null;

  const fecha = typeof item.fecha_hora === "string" ? new Date(item.fecha_hora) : null;
  const fechaLabel = fecha && !Number.isNaN(fecha.getTime())
    ? fecha.toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Sin fecha";

  const remito = item.remito_uva && typeof item.remito_uva === "object"
    ? (item.remito_uva as Record<string, unknown>)
    : {};
  const finca = remito.finca && typeof remito.finca === "object"
    ? (remito.finca as Record<string, unknown>)
    : {};
  const cuartel = remito.cuartel && typeof remito.cuartel === "object"
    ? (remito.cuartel as Record<string, unknown>)
    : {};

  const fincaLabel = typeof finca.nombre_finca === "string" ? finca.nombre_finca : null;
  const cuartelLabel = typeof cuartel.codigo_cuartel === "string" ? cuartel.codigo_cuartel : null;
  const kg = typeof item.kg_pesados === "string" || typeof item.kg_pesados === "number"
    ? `${item.kg_pesados} kg`
    : null;

  return {
    value: String(id),
    label: [
      fechaLabel,
      [fincaLabel, cuartelLabel].filter(Boolean).join(" / "),
      kg,
    ].filter(Boolean).join(" · "),
  };
}

type VasijasProcesoPageProps = {
  initialSection?: "vasijas" | "operaciones" | "existencias" | "fermentacion";
  hideSectionSelector?: boolean;
  hidePrimaryAction?: boolean;
  /** Valores por defecto para el formulario de Operaciones Vasija (ej. ingreso desde recepción). */
  operacionDefaultValues?: Record<string, string | boolean>;
  /** Renderiza el formulario de Operaciones inline (no en modal). Útil en el flujo guiado. */
  inlineOperacionForm?: boolean;
};

export default function VasijasProcesoPage({
  initialSection = "vasijas",
  hideSectionSelector = false,
  hidePrimaryAction = false,
  operacionDefaultValues,
  inlineOperacionForm = false,
}: VasijasProcesoPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const [activeSection, setActiveSection] = useState<
    "vasijas" | "operaciones" | "existencias" | "fermentacion"
  >(initialSection);

  // La sección visible se sincroniza desde la URL/props (fuente de verdad), ajustando
  // el estado durante el render en lugar de en un efecto para evitar renders en cascada.
  const resolvedSection: "vasijas" | "operaciones" | "existencias" | "fermentacion" = (() => {
    if (hideSectionSelector) return initialSection;
    const section = searchParams.get("section");
    if (
      section === "vasijas" ||
      section === "operaciones" ||
      section === "existencias" ||
      section === "fermentacion"
    ) {
      return section;
    }
    return initialSection;
  })();
  const [syncedSection, setSyncedSection] = useState(resolvedSection);
  if (syncedSection !== resolvedSection) {
    setSyncedSection(resolvedSection);
    setActiveSection(resolvedSection);
  }
  const [vasijaOptions, setVasijaOptions] = useState<SelectOption[]>([]);
  const [recepcionOptions, setRecepcionOptions] = useState<SelectOption[]>([]);
  const [vasijaOptionsVersion, setVasijaOptionsVersion] = useState(0);
  const [bodegaUsers, setBodegaUsers] = useState<AuthUser[]>([]);

  // vasijaId en el query param pre-selecciona la vasija al llegar desde /bodega/vasijas
  const preselectedVasijaId = searchParams.get("vasijaId") ?? "";
  // recepcionId / tipo en el query param pre-cargan un ingreso a vasija desde la recepción
  const preselectedRecepcionId = searchParams.get("recepcionId") ?? "";
  const preselectedTipo = searchParams.get("tipo") ?? "";

  const operacionDefaults = useMemo<Record<string, string | boolean> | undefined>(() => {
    const defaults: Record<string, string | boolean> = { ...(operacionDefaultValues ?? {}) };
    if (preselectedVasijaId) defaults.vasijaOrigenId = preselectedVasijaId;
    if (preselectedRecepcionId) {
      defaults.recepcionBodegaId = preselectedRecepcionId;
      if (!defaults.tipo) defaults.tipo = "ingreso";
    }
    if (preselectedTipo) defaults.tipo = preselectedTipo;
    return Object.keys(defaults).length > 0 ? defaults : undefined;
  }, [operacionDefaultValues, preselectedVasijaId, preselectedRecepcionId, preselectedTipo]);

  useEffect(() => {
    if (!activeBodegaId) return;
    listElaboracionResource("vasijas", { bodegaId: String(activeBodegaId) }).then((vasijas) => {
      setVasijaOptions(toOptions(vasijas, ["id_vasija", "vasija_id", "id"], ["codigo", "tipo", "id_vasija"]));
    });
    listElaboracionResource("recepciones-bodega", { bodegaId: String(activeBodegaId) })
      .then((recepciones) => {
        setRecepcionOptions(
          recepciones
            .map(formatRecepcionOption)
            .filter((option): option is SelectOption => option !== null),
        );
      })
      .catch(() => setRecepcionOptions([]));
    // vasijaOptionsVersion se incrementa cada vez que se crea una vasija nueva,
    // asegurando que los selects en otras secciones reflejen el estado actual.
    fetchAuthUsers()
      .then((users) => {
        setBodegaUsers(
          users.filter((user) =>
            user.bodegas.some((bodega) => String(bodega.bodega_id) === String(activeBodegaId)),
          ),
        );
      })
      .catch(() => setBodegaUsers([]));
  }, [activeBodegaId, vasijaOptionsVersion]);

  const userOptions = useMemo<SelectOption[]>(
    () =>
      bodegaUsers.map((user) => ({
        value: String(user.id),
        label: [user.nombre, user.email].filter(Boolean).join(" · "),
      })),
    [bodegaUsers],
  );

  const enologoOptions = useMemo<SelectOption[]>(
    () =>
      bodegaUsers
        .filter((user) =>
          user.bodegas.some(
            (bodega) =>
              String(bodega.bodega_id) === String(activeBodegaId) &&
              (bodega.roles_en_bodega ?? (bodega.rol_en_bodega ? [bodega.rol_en_bodega] : [])).includes("enologo"),
          ),
        )
        .map((user) => ({
          value: String(user.id),
          label: [user.nombre, user.email].filter(Boolean).join(" · "),
        })),
    [activeBodegaId, bodegaUsers],
  );

  return (
    <div className="space-y-5">
      {!hideSectionSelector ? (
        <AppCard
          as="section"
          tone="default"
          padding="lg"
          className="bg-[color:var(--surface-hero)] text-[color:var(--text-on-dark)]"
          header={(
            <SectionIntro
              eyebrow="Bodega"
              title="Vasijas y Proceso"
              description="Registro de vasijas, operaciones de elaboración, existencias y control de fermentación."
              descriptionClassName="text-[color:var(--text-on-dark-muted)]"
            />
          )}
        >
          <SectionSelector
            bare
            value={activeSection}
            onChange={(value) => {
              setActiveSection(value);
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.set("section", value);
                return next;
              });
            }}
            options={[
              { key: "vasijas", label: "Vasijas" },
              { key: "operaciones", label: "Operaciones Vasija" },
              { key: "existencias", label: "Existencias Vasija" },
              { key: "fermentacion", label: "Control Fermentación" },
            ]}
          />
        </AppCard>
      ) : null}

      {activeSection === "vasijas" ? (
        <GenericCrudSection
          title="Vasijas"
          description="Registro de vasijas de la bodega."
          resource="vasijas"
          bodegaId={activeBodegaId}
          hidePrimaryAction={hidePrimaryAction}
          formInModal={!hidePrimaryAction}
          fields={VASIJA_FIELDS}
          onCreated={() => setVasijaOptionsVersion((v) => v + 1)}
        />
      ) : null}

      {activeSection === "operaciones" ? (
        <GenericCrudSection
          title="Operaciones Vasija"
          description="Eventos de proceso según enum TipoOperacionVasija."
          resource="operaciones-vasija"
          bodegaId={activeBodegaId}
          hidePrimaryAction={hidePrimaryAction}
          formInModal={inlineOperacionForm ? false : !hidePrimaryAction}
          autoOpenForm={!inlineOperacionForm}
          defaultValues={operacionDefaults}
          fields={[
            // El vínculo a recepción (ingreso de uva) solo aplica cuando venís del flujo
            // guiado de ingreso o llegás con ?recepcionId=. En un movimiento normal entre
            // vasijas el líquido ya está en una vasija y no corresponde una recepción.
            ...(inlineOperacionForm || preselectedRecepcionId
              ? [
                  {
                    name: "recepcionBodegaId",
                    label: "Recepción (ingreso de uva)",
                    type: "select" as const,
                    options: recepcionOptions,
                    sourceKey: "recepcion_bodega_id",
                  },
                ]
              : []),
            // En un ingreso desde recepción la uva entra a UNA vasija: solo destino.
            // En un movimiento normal entre vasijas se muestran origen y destino.
            ...(inlineOperacionForm || preselectedRecepcionId
              ? []
              : [
                  {
                    name: "vasijaOrigenId",
                    label: "Vasija origen",
                    type: "select" as const,
                    options: vasijaOptions,
                    sourceKey: "vasija_origen_id",
                  },
                ]),
            {
              name: "vasijaDestinoId",
              label: inlineOperacionForm || preselectedRecepcionId ? "Vasija" : "Vasija destino",
              type: "select",
              required: Boolean(inlineOperacionForm || preselectedRecepcionId),
              options: vasijaOptions,
              sourceKey: "vasija_destino_id",
            },
            {
              name: "tipo",
              label: "Tipo operación",
              type: "select",
              required: true,
              options: [...OPERACION_TIPOS],
            },
            { name: "fecha_hora", label: "Fecha y hora", type: "datetime-local", required: true },
            {
              name: "enologoUserId",
              label: "Enólogo",
              type: "select",
              options: enologoOptions,
              sourceKey: "enologo_user_id",
            },
            {
              name: "actorUserId",
              label: "Usuario",
              type: "select",
              options: userOptions,
              sourceKey: "user_id",
            },
            { name: "volumen_movido_l", label: "Volumen movido (l)", type: "number" },
            { name: "observaciones", label: "Observaciones", type: "textarea" },
          ]}
        />
      ) : null}

      {activeSection === "existencias" ? (
        <GenericCrudSection
          title="Existencias Vasija"
          description="Control de stock/estado analítico en vasija."
          resource="existencias-vasija"
          bodegaId={activeBodegaId}
          withBodegaId={false}
          hidePrimaryAction={hidePrimaryAction}
          formInModal={!hidePrimaryAction}
          fields={[
            { name: "vasijaId", label: "Vasija", type: "select", required: true, options: vasijaOptions, sourceKey: "vasija_id" },
            { name: "fecha_hora", label: "Fecha y hora", type: "datetime-local", required: true },
            { name: "volumen_l", label: "Volumen (l)", type: "number" },
            { name: "grado_alcohol", label: "Grado alcohol", type: "number" },
            { name: "azucar_residual_g_l", label: "Azúcar residual g/l", type: "number" },
            { name: "observaciones", label: "Observaciones", type: "textarea" },
          ]}
        />
      ) : null}

      {activeSection === "fermentacion" ? (
        <GenericCrudSection
          title="Control Fermentación"
          description="Seguimiento de fermentación por vasija."
          resource="controles-fermentacion"
          bodegaId={activeBodegaId}
          withBodegaId={false}
          hidePrimaryAction={hidePrimaryAction}
          formInModal={!hidePrimaryAction}
          fields={[
            { name: "vasijaId", label: "Vasija", type: "select", required: true, options: vasijaOptions, sourceKey: "vasija_id" },
            { name: "fecha_hora", label: "Fecha y hora", type: "datetime-local", required: true },
            { name: "densidad", label: "Densidad", type: "number" },
            { name: "temperatura", label: "Temperatura", type: "number" },
            { name: "brix", label: "Brix", type: "number" },
            { name: "ph", label: "pH", type: "number" },
            { name: "acidez", label: "Acidez", type: "number" },
            { name: "estado_fermentacion", label: "Estado fermentación", type: "text" },
            { name: "observaciones", label: "Observaciones", type: "textarea" },
          ]}
        />
      ) : null}
    </div>
  );
}
