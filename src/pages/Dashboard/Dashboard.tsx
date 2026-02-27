import {
  AlertTriangle,
  ChevronRight,
  CircleDot,
  Droplets,
  FlaskConical,
  Search,
  ShieldAlert,
  Sprout,
} from "lucide-react";

type Kpi = {
  label: string;
  value: string;
  note: string;
  tone?: "default" | "success" | "warning" | "danger";
  highlight?: boolean;
};

type Chapter = {
  cap: string;
  title: string;
  status: "ok" | "warn" | "danger" | "info";
};

type Finding = {
  issue: string;
  norm: string;
  location: string;
  status: "BLOQUEO" | "ALERTA" | "INFO";
};

type Event = {
  time: string;
  title: string;
  subtitle: string;
  icon: "sprout" | "drop" | "flask" | "ok";
};

const kpis: Kpi[] = [
  { label: "Campañas", value: "3", note: "Activas", tone: "success" },
  { label: "Cuarteles", value: "48", note: "+5%", tone: "success" },
  { label: "Lotes", value: "156", note: "Total" },
  {
    label: "Hallazgos",
    value: "12",
    note: "Abiertos",
    tone: "danger",
    highlight: true,
  },
  { label: "Consumo Agua", value: "450", note: "m³/ha", tone: "success" },
  { label: "Aplicaciones", value: "24", note: "mes", tone: "warning" },
  { label: "Carencias OK", value: "98%", note: "vigentes", tone: "success" },
];

const chapters: Chapter[] = [
  { cap: "CAP 0", title: "Origen", status: "ok" },
  { cap: "CAP 1", title: "Viticultura", status: "ok" },
  { cap: "CAP 2", title: "Agua", status: "warn" },
  { cap: "CAP 3", title: "Suelo", status: "ok" },
  { cap: "CAP 4", title: "Fitosanitaria", status: "danger" },
  { cap: "CAP 5", title: "Energía", status: "warn" },
  { cap: "CAP 6", title: "Social", status: "ok" },
  { cap: "CAP 7", title: "Residuos", status: "ok" },
  { cap: "CAP 8", title: "Biodiversidad", status: "info" },
];

const findings: Finding[] = [
  {
    issue: "Falta bitácora de riego",
    norm: "GlobalG.A.P. FV 5.2",
    location: "Finca San Juan / C4",
    status: "BLOQUEO",
  },
  {
    issue: "Exceso dosis aplicación",
    norm: "Cert. Sustentabilidad 4.1",
    location: "Finca El Alto / C12",
    status: "ALERTA",
  },
  {
    issue: "Vencimiento mantenimiento bomba",
    norm: "Interno MANT-09",
    location: "General",
    status: "INFO",
  },
];

const events: Event[] = [
  {
    time: "Hoy, 08:45 AM",
    title: "Cosecha iniciada",
    subtitle: "Cuartel 4 - Malbec",
    icon: "sprout",
  },
  {
    time: "Ayer, 04:20 PM",
    title: "Riego programado",
    subtitle: "Sector Sur (2.5 hrs)",
    icon: "drop",
  },
  {
    time: "12 Oct, 10:00 AM",
    title: "Aplicación fungicida",
    subtitle: "Certificado por: J. Pérez",
    icon: "flask",
  },
  {
    time: "10 Oct, 03:15 PM",
    title: "Auditoría interna OK",
    subtitle: "Capítulo Social completo",
    icon: "ok",
  },
];

const toneClass: Record<NonNullable<Kpi["tone"]>, string> = {
  default: "text-text",
  success: "text-emerald-400",
  warning: "text-amber-400",
  danger: "text-red-400",
};

const statusDotClass: Record<Chapter["status"], string> = {
  ok: "bg-emerald-400",
  warn: "bg-amber-400",
  danger: "bg-red-400",
  info: "bg-slate-400",
};

const badgeClass: Record<Finding["status"], string> = {
  BLOQUEO: "bg-red-500/20 text-red-300 ring-1 ring-red-500/30",
  ALERTA: "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30",
  INFO: "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30",
};

const eventIcon = (icon: Event["icon"]) => {
  if (icon === "sprout") return <Sprout className="h-4 w-4" />;
  if (icon === "drop") return <Droplets className="h-4 w-4" />;
  if (icon === "flask") return <FlaskConical className="h-4 w-4" />;
  return <CircleDot className="h-4 w-4" />;
};

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-secondary px-4 py-6 text-text sm:px-6">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <section className="space-y-4">
          <h1 className="text-2xl font-bold sm:text-3xl">Resumen Ejecutivo</h1>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
            {kpis.map((item) => (
              <article
                key={item.label}
                className={[
                  "rounded-2xl border bg-primary/30 p-4 backdrop-blur-sm",
                  item.highlight
                    ? "border-red-500/30 shadow-[0_0_0_1px_rgba(239,68,68,0.18)]"
                    : "border-white/5",
                ].join(" ")}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
                  {item.label}
                </p>
                <div className="mt-5 flex items-end gap-2">
                  <p className="text-4xl font-bold leading-none">{item.value}</p>
                  <p
                    className={`mb-1 text-xs font-semibold ${toneClass[item.tone ?? "default"]}`}
                  >
                    {item.note}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_290px]">
          <section className="space-y-6">
            <article className="rounded-2xl border border-white/5 bg-primary/25 p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold">
                  Estado por Capítulos de Sustentabilidad
                </h2>
                <button className="text-xs font-semibold uppercase tracking-[0.14em] text-red-400/80">
                  Ver detalles
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                {chapters.map((item) => (
                  <div
                    key={`${item.cap}-${item.title}`}
                    className="rounded-xl border border-white/5 bg-[#1b0f10] p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                        {item.cap}
                      </p>
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${statusDotClass[item.status]}`}
                      />
                    </div>
                    <p className="mt-1 text-sm font-semibold">{item.title}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="overflow-hidden rounded-2xl border border-white/5 bg-primary/25">
              <div className="border-b border-white/5 px-4 py-4 sm:px-5">
                <h2 className="text-xl font-semibold">
                  Centro de Cumplimiento (Hallazgos Recientes)
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#2b1114] text-[11px] uppercase tracking-[0.12em] text-text-secondary">
                    <tr>
                      <th className="px-5 py-3">Hallazgo</th>
                      <th className="px-5 py-3">Regla / Norma</th>
                      <th className="px-5 py-3">Finca / Cuartel</th>
                      <th className="px-5 py-3">Estado</th>
                      <th className="px-5 py-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {findings.map((row, idx) => (
                      <tr
                        key={row.issue}
                        className={idx % 2 === 0 ? "bg-[#210f11]" : "bg-[#1e0d0f]"}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 font-medium">
                            <AlertTriangle className="h-4 w-4 text-amber-400" />
                            {row.issue}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-text-secondary">{row.norm}</td>
                        <td className="px-5 py-4">{row.location}</td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-bold tracking-wide ${badgeClass[row.status]}`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button className="rounded-md bg-red-700/80 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide">
                              Resolver
                            </button>
                            <button className="rounded-md bg-white/10 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide">
                              Detalle
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </section>

          <aside className="space-y-4">
            <article className="rounded-2xl border border-white/5 bg-primary/25 p-4">
              <h3 className="text-2xl font-semibold leading-tight">Buscador de Lotes</h3>
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-black/15 px-3 py-2">
                <Search className="h-4 w-4 text-text-secondary" />
                <input
                  placeholder="Ej: MALB-2025-C4..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-text-secondary"
                />
              </div>

              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">
                Recientes
              </p>
              <div className="mt-2 space-y-2">
                {["LOT-CHARD-001", "LOT-CAB-232", "LOT-MALB-115"].map((code) => (
                  <button
                    key={code}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-white/5"
                  >
                    <span>{code}</span>
                    <ChevronRight className="h-4 w-4 text-text-secondary" />
                  </button>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-white/5 bg-primary/25 p-4">
              <h3 className="text-3xl font-semibold">Eventos Recientes</h3>
              <div className="mt-4 space-y-4">
                {events.map((event) => (
                  <div key={event.title} className="flex gap-3">
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-900/60 text-red-200">
                      {eventIcon(event.icon)}
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">{event.time}</p>
                      <p className="text-sm font-semibold">{event.title}</p>
                      <p className="text-xs text-text-secondary">{event.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-white/5 bg-primary/25 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <ShieldAlert className="h-4 w-4" />
                Soporte técnico y documentación
              </div>
            </article>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
