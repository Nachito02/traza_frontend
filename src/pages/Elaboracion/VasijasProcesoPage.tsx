import { useEffect, useMemo, useState } from "react";
import { listElaboracionResource, type ElaboracionEntity } from "../../features/elaboracion/api";
import { OPERACION_TIPOS } from "../../features/elaboracion/vasijaFields";
import { useAuthStore } from "../../store/authStore";
import { AppCard, NoticeBanner, SectionIntro } from "../../components/ui";
import GenericCrudSection, { type CrudField, type SelectOption } from "./components/GenericCrudSection";
import VasijaComposicionPanel from "./components/VasijaComposicionPanel";
import VasijaEstadoPanel from "./components/VasijaEstadoPanel";
import { useSearchParams } from "react-router-dom";
import { fetchAuthUsers, type AuthUser } from "../../features/users/api";
import { fetchImpactoBorradoLote } from "../../features/lotes/api";


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
  const patente = typeof remito.patente === "string" && remito.patente.trim()
    ? `Patente ${remito.patente}`
    : null;
  const transportista = typeof remito.transportista === "string" && remito.transportista.trim()
    ? remito.transportista.trim()
    : null;

  return {
    value: String(id),
    label: [
      fechaLabel,
      [fincaLabel, cuartelLabel].filter(Boolean).join(" / "),
      kg,
      patente,
      transportista,
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
  initialSection = "existencias",
  hideSectionSelector = false,
  hidePrimaryAction = false,
  operacionDefaultValues,
  inlineOperacionForm = false,
}: VasijasProcesoPageProps) {
  const [searchParams] = useSearchParams();
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const [vasijaOptions, setVasijaOptions] = useState<SelectOption[]>([]);
  const [recepcionOptions, setRecepcionOptions] = useState<SelectOption[]>([]);
  const [vasijaOptionsVersion, setVasijaOptionsVersion] = useState(0);
  const [operacionFormValues, setOperacionFormValues] = useState<Record<string, string | boolean>>({});
  // Dispara el modal de "Operaciones Vasija" desde un botón/ícono de la grilla de
  // vasijas — no hay más una pestaña/lista persistente para esto en la página
  // normal. El token fuerza el remount de GenericCrudSection para que
  // `autoOpenForm` vuelva a abrir el modal en cada click (si no, solo se abre
  // la primera vez que el componente se monta).
  const [operacionModalOpen, setOperacionModalOpen] = useState(false);
  const [operacionModalToken, setOperacionModalToken] = useState(0);
  const [manualOperacionVasijaId, setManualOperacionVasijaId] = useState<string | undefined>(undefined);

  const openOperacionModal = (vasijaId?: string) => {
    setManualOperacionVasijaId(vasijaId);
    setOperacionModalToken((t) => t + 1);
    setOperacionModalOpen(true);
  };
  const closeOperacionModal = () => {
    setOperacionModalOpen(false);
    setManualOperacionVasijaId(undefined);
  };
  const [bodegaUsers, setBodegaUsers] = useState<AuthUser[]>([]);
  // Solo se usa en el flujo guiado (inlineOperacionForm): un lote puede repartirse
  // entre varias vasijas — acá se lleva la cuenta de a cuáles ya se mandó, para
  // mostrar el resumen y sugerir la misma vasija por defecto (lo normal es seguir
  // llenando la misma; elegir otra queda como excepción, no como paso obligatorio).
  const [asignacionesLote, setAsignacionesLote] = useState<Array<{ vasijaId: string; volumen: number }>>([]);

  // vasijaId en el query param pre-selecciona la vasija al llegar desde /bodega/vasijas
  const preselectedVasijaId = searchParams.get("vasijaId") ?? "";
  // recepcionId / tipo en el query param pre-cargan un ingreso a vasija desde la recepción
  const preselectedRecepcionId = searchParams.get("recepcionId") ?? "";
  const preselectedTipo = searchParams.get("tipo") ?? "";

  // Al llegar con un lote ya elegido (flujo guiado), trae lo que ese lote YA tiene
  // en vasija desde la base — no alcanza con lo cargado en esta sesión: si el
  // usuario recarga la página o vuelve más tarde, tiene que seguir viendo el
  // resumen real y que el form le siga sugiriendo la misma vasija.
  useEffect(() => {
    const loteId = operacionDefaultValues?.loteId;
    if (!inlineOperacionForm || typeof loteId !== "string" || !loteId) return;
    let mounted = true;
    fetchImpactoBorradoLote(loteId)
      .then((impacto) => {
        if (!mounted) return;
        const activos = impacto.vasijaContenido.filter((v) => v.activo);
        setAsignacionesLote(activos.map((v) => ({ vasijaId: v.vasija_id, volumen: v.volumen_l })));
      })
      .catch(() => {
        // si falla, el form se muestra igual sin sugerencia — no es bloqueante
      });
    return () => {
      mounted = false;
    };
  }, [inlineOperacionForm, operacionDefaultValues?.loteId]);

  // Si el lote ya está entrando a una única vasija, esa es la sugerida por defecto
  // (lo normal es seguir llenándola); si ya está repartido en más de una, no se
  // adivina cuál — el enólogo elige.
  const vasijaIdsEnUso = useMemo(
    () => Array.from(new Set(asignacionesLote.map((a) => a.vasijaId))),
    [asignacionesLote],
  );
  const vasijaSugeridaId = vasijaIdsEnUso.length === 1 ? vasijaIdsEnUso[0] : undefined;

  const operacionDefaults = useMemo<Record<string, string | boolean> | undefined>(() => {
    const defaults: Record<string, string | boolean> = { ...(operacionDefaultValues ?? {}) };
    if (preselectedVasijaId) defaults.vasijaOrigenId = preselectedVasijaId;
    if (manualOperacionVasijaId) defaults.vasijaOrigenId = manualOperacionVasijaId;
    if (preselectedRecepcionId) {
      defaults.recepcionBodegaId = preselectedRecepcionId;
      if (!defaults.tipo) defaults.tipo = "ingreso";
    }
    if (preselectedTipo) defaults.tipo = preselectedTipo;
    if (inlineOperacionForm && vasijaSugeridaId && !defaults.vasijaDestinoId) {
      defaults.vasijaDestinoId = vasijaSugeridaId;
    }
    return Object.keys(defaults).length > 0 ? defaults : undefined;
  }, [
    operacionDefaultValues,
    preselectedVasijaId,
    manualOperacionVasijaId,
    preselectedRecepcionId,
    preselectedTipo,
    inlineOperacionForm,
    vasijaSugeridaId,
  ]);

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

  const handleOperacionCreated = (item: ElaboracionEntity) => {
    const vasijaId = item.vasija_destino_id;
    const volumen = item.volumen_movido_l;
    if (typeof vasijaId === "string" && (typeof volumen === "number" || typeof volumen === "string")) {
      setAsignacionesLote((prev) => [...prev, { vasijaId, volumen: Number(volumen) }]);
    }
  };

  // Tiene que estar memoizado: `onValuesChange` empuja cada cambio hacia arriba
  // (operacionFormValues), lo que re-renderiza este componente. Si `fields` fuera
  // un array literal nuevo en cada render, el `useEffect` de GenericCrudSection
  // (que depende de `fields`) lo detecta como "cambiaron los fields" y pisa los
  // valores del form con `defaultValues` de nuevo — el select de vasija quedaba
  // sin poder elegirse porque cada clic se revertía solo.
  const operacionFields = useMemo<CrudField[]>(() => {
    // Sin tipo elegido, el resto del form ni se muestra — se arranca eligiendo
    // qué operación es, y recién ahí aparece lo que corresponda a esa elección.
    const hastaElegirTipo = (values: Record<string, string | boolean>) => !values.tipo;
    // Fermentación/corrección son de una sola vasija: "destino" no aplica.
    const esUnaSolaVasija = (values: Record<string, string | boolean>) =>
      values.tipo === "fermentacion" || values.tipo === "correccion";
    const hastaElegirTipoOUnaVasija = (values: Record<string, string | boolean>) =>
      hastaElegirTipo(values) || esUnaSolaVasija(values);

    return [
      {
        name: "tipo",
        label: "Tipo operación",
        type: "select" as const,
        required: true,
        options: [...OPERACION_TIPOS],
      },
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
              hiddenWhen: hastaElegirTipo,
            },
          ]
        : []),
      // El lote de bodega se arma antes de este paso (ver LoteSelectorPanel); acá
      // solo viaja fijo en el payload, no se puede tocar desde este formulario.
      ...(typeof operacionDefaults?.loteId === "string" && operacionDefaults.loteId
        ? [
            {
              name: "loteId",
              label: "Lote",
              type: "text" as const,
              disabled: true,
              hiddenWhen: hastaElegirTipo,
            },
          ]
        : []),
      // En un ingreso desde recepción la uva entra a UNA vasija: solo destino
      // (no se muestra "origen" en absoluto). En fermentación/corrección
      // también es una sola vasija — se guarda como "origen" y "destino" se
      // esconde con `hiddenWhen` (no se saca del array: si estuviera afuera,
      // cambiar el tipo cambiaría la referencia de `fields` y GenericCrudSection
      // resetea todo el form apenas eso pasa).
      // En trasiego/descube/corte parcial se ven las dos, porque ahí sí hay un
      // traspaso real entre dos vasijas.
      ...(inlineOperacionForm || preselectedRecepcionId
        ? []
        : [
            {
              name: "vasijaOrigenId",
              label: "Vasija origen",
              // "Origen" solo tiene sentido si también hay un "destino" — con
              // una sola vasija de por medio (fermentación/corrección) es
              // simplemente "la vasija".
              labelWhen: (values: Record<string, string | boolean>) =>
                esUnaSolaVasija(values) ? "Vasija" : "Vasija origen",
              type: "select" as const,
              options: vasijaOptions,
              sourceKey: "vasija_origen_id",
              hiddenWhen: hastaElegirTipo,
            },
          ]),
      {
        name: "vasijaDestinoId",
        label: inlineOperacionForm || preselectedRecepcionId ? "Vasija" : "Vasija destino",
        type: "select" as const,
        required: Boolean(inlineOperacionForm || preselectedRecepcionId),
        options: vasijaOptions,
        sourceKey: "vasija_destino_id",
        hiddenWhen: inlineOperacionForm || preselectedRecepcionId ? undefined : hastaElegirTipoOUnaVasija,
      },
      { name: "fecha_hora", label: "Fecha y hora", type: "datetime-local", required: true, hiddenWhen: hastaElegirTipo },
      {
        name: "enologoUserId",
        label: "Enólogo",
        type: "select",
        options: enologoOptions,
        sourceKey: "enologo_user_id",
        hiddenWhen: hastaElegirTipo,
      },
      {
        name: "actorUserId",
        label: "Usuario",
        type: "select",
        options: userOptions,
        sourceKey: "user_id",
        hiddenWhen: hastaElegirTipo,
      },
      {
        name: "volumen_movido_l",
        label: "Volumen movido (l)",
        // "Movido" es correcto para trasiego/descube/corte parcial (se pasa de
        // una vasija a otra). Para ingreso no se mueve, entra; y en
        // fermentación/corrección no se mueve nada en absoluto.
        labelWhen: (values: Record<string, string | boolean>) => {
          if (values.tipo === "ingreso") return "Volumen ingresado (l)";
          if (esUnaSolaVasija(values)) return "Volumen (l)";
          return "Volumen movido (l)";
        },
        type: "number",
        hiddenWhen: hastaElegirTipo,
      },
      { name: "observaciones", label: "Observaciones", type: "textarea", hiddenWhen: hastaElegirTipo },
    ];
  },
    [
      inlineOperacionForm,
      preselectedRecepcionId,
      recepcionOptions,
      operacionDefaults,
      vasijaOptions,
      enologoOptions,
      userOptions,
    ],
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
              title="Gestión de vasijas"
              description="Estado de existencias, alta, edición y movimientos de las vasijas de la bodega activa."
              descriptionClassName="text-[color:var(--text-on-dark-muted)]"
            />
          )}
        />
      ) : null}

      {/* Flujo guiado de ingreso de uva (IngresoUvaFlowPage): embebe solo el
          formulario de Operaciones, inline, como un paso más del wizard. */}
      {hideSectionSelector && initialSection === "operaciones" ? (
        <div className="space-y-3">
        {typeof operacionFormValues.vasijaOrigenId === "string" && operacionFormValues.vasijaOrigenId ? (
          <VasijaComposicionPanel vasijaId={operacionFormValues.vasijaOrigenId} />
        ) : null}

        {inlineOperacionForm && asignacionesLote.length > 0 ? (
          <NoticeBanner tone="success" title="Ya se mandó a vasija:">
            <ul className="list-disc pl-5">
              {asignacionesLote.map((a, i) => (
                <li key={i}>
                  {vasijaOptions.find((o) => o.value === a.vasijaId)?.label ?? a.vasijaId} — {a.volumen} l
                </li>
              ))}
            </ul>
            {vasijaSugeridaId ? (
              <p className="mt-1 text-xs opacity-80">
                Por defecto sigue completando esa misma vasija — cambiala abajo solo si se llenó o
                si vas a separar parte del lote a otra.
              </p>
            ) : null}
          </NoticeBanner>
        ) : null}

        <GenericCrudSection
          title="Operaciones Vasija"
          description="Eventos de proceso según enum TipoOperacionVasija."
          resource="operaciones-vasija"
          bodegaId={activeBodegaId}
          hidePrimaryAction={hidePrimaryAction}
          formInModal={inlineOperacionForm ? false : !hidePrimaryAction}
          autoOpenForm={!inlineOperacionForm}
          defaultValues={operacionDefaults}
          onValuesChange={setOperacionFormValues}
          fields={operacionFields}
          onCreated={inlineOperacionForm ? handleOperacionCreated : undefined}
        />
        </div>
      ) : null}

      {/* Página normal: una sola vista, sin pestañas. La grilla de vasijas es lo
          primero que se ve; "Nueva operación" (botón arriba o ícono por tarjeta)
          dispara el mismo formulario de Operaciones, pero como modal puntual —
          no queda un panel/lista persistente ocupando lugar. */}
      {!hideSectionSelector ? (
        <VasijaEstadoPanel
          bodegaId={activeBodegaId}
          refreshKey={vasijaOptionsVersion}
          onChanged={() => setVasijaOptionsVersion((v) => v + 1)}
          onRegistrarOperacion={openOperacionModal}
        />
      ) : null}

      {!hideSectionSelector && operacionModalOpen ? (
        <GenericCrudSection
          key={operacionModalToken}
          title="Operaciones Vasija"
          description="Eventos de proceso según enum TipoOperacionVasija."
          resource="operaciones-vasija"
          bodegaId={activeBodegaId}
          formInModal
          hideContainer
          autoOpenForm
          defaultValues={operacionDefaults}
          onValuesChange={setOperacionFormValues}
          fields={operacionFields}
          onCreated={() => {
            closeOperacionModal();
            setVasijaOptionsVersion((v) => v + 1);
          }}
          onCancel={closeOperacionModal}
        />
      ) : null}
    </div>
  );
}
