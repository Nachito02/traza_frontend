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

type VasijasProcesoPageProps = {
  initialSection?: "vasijas" | "operaciones" | "existencias" | "fermentacion";
  hideSectionSelector?: boolean;
  hidePrimaryAction?: boolean;
};

export default function VasijasProcesoPage({
  initialSection = "vasijas",
  hideSectionSelector = false,
  hidePrimaryAction = false,
}: VasijasProcesoPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const [activeSection, setActiveSection] = useState<
    "vasijas" | "operaciones" | "existencias" | "fermentacion"
  >(initialSection);
  const [vasijaOptions, setVasijaOptions] = useState<SelectOption[]>([]);
  const [vasijaOptionsVersion, setVasijaOptionsVersion] = useState(0);
  const [bodegaUsers, setBodegaUsers] = useState<AuthUser[]>([]);

  // vasijaId en el query param pre-selecciona la vasija al llegar desde /bodega/vasijas
  const preselectedVasijaId = searchParams.get("vasijaId") ?? "";

  useEffect(() => {
    if (hideSectionSelector) {
      setActiveSection(initialSection);
      return;
    }
    const section = searchParams.get("section");
    if (
      section === "vasijas" ||
      section === "operaciones" ||
      section === "existencias" ||
      section === "fermentacion"
    ) {
      setActiveSection(section);
      return;
    }
    setActiveSection(initialSection);
  }, [hideSectionSelector, initialSection, searchParams]);

  useEffect(() => {
    if (!activeBodegaId) return;
    listElaboracionResource("vasijas", { bodegaId: String(activeBodegaId) }).then((vasijas) => {
      setVasijaOptions(toOptions(vasijas, ["id_vasija", "vasija_id", "id"], ["codigo", "tipo", "id_vasija"]));
    });
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
          formInModal={!hidePrimaryAction}
          defaultValues={preselectedVasijaId ? { vasijaOrigenId: preselectedVasijaId } : undefined}
          fields={[
            {
              name: "vasijaOrigenId",
              label: "Vasija origen",
              type: "select",
              options: vasijaOptions,
              sourceKey: "vasija_origen_id",
            },
            {
              name: "vasijaDestinoId",
              label: "Vasija destino",
              type: "select",
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
