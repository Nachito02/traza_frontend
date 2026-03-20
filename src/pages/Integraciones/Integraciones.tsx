import { useEffect, useMemo, useState } from "react";
import {
  BOT_SCOPES,
  BOT_SCOPE_LABELS,
  createDelegation,
  fetchMyDelegations,
  revokeDelegation,
  type BotScope,
  type Delegation,
} from "../../features/bot/api";
import { fetchAuthUsers, registerBot, type AuthUser } from "../../features/users/api";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

function normalizeRoles(roles: unknown): string[] {
  if (typeof roles === "string") return [roles.toLowerCase().trim()].filter(Boolean);
  if (!Array.isArray(roles)) return [];
  return roles
    .flatMap((r) => {
      if (typeof r === "string") return [r];
      if (r && typeof r === "object") {
        const a = r as Record<string, unknown>;
        return [a.rol_global, a.rol, a.role].filter((v): v is string => typeof v === "string");
      }
      return [];
    })
    .map((r) => r.toLowerCase().trim())
    .filter(Boolean);
}

type BotForm = { nombre: string; email: string; password: string };
type DelegationForm = {
  botUserId: string;
  bodegaId: string;
  scopes: BotScope[];
  expiresAt: string;
};

const EMPTY_DELEGATION_FORM: DelegationForm = {
  botUserId: "",
  bodegaId: "",
  scopes: [],
  expiresAt: "",
};

const Integraciones = () => {
  const actorUser = useAuthStore((state) => state.user);
  const bodegas = useAuthStore((state) => state.bodegas);
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);

  // permisos
  const isAdminSistema = useMemo(() => {
    const roles = normalizeRoles([
      (actorUser as { roles_globales?: unknown } | null)?.roles_globales,
      (actorUser as { rol?: unknown } | null)?.rol,
    ]);
    return roles.includes("admin_sistema");
  }, [actorUser]);

  // ─── bots ────────────────────────────────────────────────────────────────
  const [bots, setBots] = useState<AuthUser[]>([]);
  const [botsLoading, setBotsLoading] = useState(false);
  const [botError, setBotError] = useState<string | null>(null);
  const [botNotice, setBotNotice] = useState<string | null>(null);
  const [showBotForm, setShowBotForm] = useState(false);
  const [botForm, setBotForm] = useState<BotForm>({ nombre: "", email: "", password: "" });
  const [botSaving, setBotSaving] = useState(false);

  const loadBots = async () => {
    setBotsLoading(true);
    try {
      const all = await fetchAuthUsers();
      setBots((all ?? []).filter((u) => u.roles_globales.includes("bot_agent")));
    } catch {
      setBots([]);
    } finally {
      setBotsLoading(false);
    }
  };

  useEffect(() => {
    void loadBots();
  }, []);

  const onRegisterBot = async () => {
    if (!botForm.nombre.trim()) { setBotError("Nombre obligatorio."); return; }
    if (!botForm.email.trim()) { setBotError("Email obligatorio."); return; }
    if (!botForm.password.trim()) { setBotError("Password obligatoria."); return; }
    setBotSaving(true);
    setBotError(null);
    setBotNotice(null);
    try {
      await registerBot({ nombre: botForm.nombre.trim(), email: botForm.email.trim(), password: botForm.password });
      setBotNotice(`Bot "${botForm.nombre.trim()}" registrado correctamente.`);
      setBotForm({ nombre: "", email: "", password: "" });
      setShowBotForm(false);
      await loadBots();
    } catch (e) {
      setBotError(getApiErrorMessage(e));
    } finally {
      setBotSaving(false);
    }
  };

  // ─── delegaciones ────────────────────────────────────────────────────────
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [delegationsLoading, setDelegationsLoading] = useState(true);
  const [delError, setDelError] = useState<string | null>(null);
  const [delNotice, setDelNotice] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [showDelForm, setShowDelForm] = useState(false);
  const [delForm, setDelForm] = useState<DelegationForm>(EMPTY_DELEGATION_FORM);
  const [delSaving, setDelSaving] = useState(false);

  const loadDelegations = async () => {
    setDelegationsLoading(true);
    try {
      const data = await fetchMyDelegations();
      setDelegations(data);
    } catch (e) {
      setDelError(getApiErrorMessage(e));
    } finally {
      setDelegationsLoading(false);
    }
  };

  useEffect(() => {
    void loadDelegations();
  }, []);

  const onRevoke = async (id: string) => {
    if (!window.confirm("¿Revocar esta delegación?")) return;
    setRevokingId(id);
    setDelError(null);
    setDelNotice(null);
    try {
      await revokeDelegation(id);
      setDelNotice("Delegación revocada.");
      await loadDelegations();
    } catch (e) {
      setDelError(getApiErrorMessage(e));
    } finally {
      setRevokingId(null);
    }
  };

  const onCreateDelegation = async () => {
    if (!delForm.botUserId.trim()) { setDelError("Seleccioná un bot."); return; }
    if (delForm.scopes.length === 0) { setDelError("Seleccioná al menos un scope."); return; }
    setDelSaving(true);
    setDelError(null);
    setDelNotice(null);
    try {
      await createDelegation({
        botUserId: delForm.botUserId.trim(),
        bodegaId: delForm.bodegaId.trim() || null,
        scopes: delForm.scopes,
        expiresAt: delForm.expiresAt.trim() || null,
      });
      setDelNotice("Delegación creada correctamente.");
      setDelForm(EMPTY_DELEGATION_FORM);
      setShowDelForm(false);
      await loadDelegations();
    } catch (e) {
      setDelError(getApiErrorMessage(e));
    } finally {
      setDelSaving(false);
    }
  };

  // bot ID preferido para preseleccionar en el form de delegación
  const defaultBotId = useMemo(() => bots[0]?.id ?? "", [bots]);

  const openDelForm = () => {
    setDelForm({ ...EMPTY_DELEGATION_FORM, botUserId: defaultBotId, bodegaId: String(activeBodegaId ?? "") });
    setShowDelForm(true);
  };

  const getBodegaName = (id: string | null) => {
    if (!id) return "Todas las bodegas";
    return bodegas.find((b) => String(b.bodega_id) === id)?.nombre ?? id;
  };

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text">Bots</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Gestioná bots y delegaciones de acceso.
          </p>
        </div>

        {/* ─── Panel del Bot (solo admin_sistema) ─── */}
        {isAdminSistema ? (
          <section className="rounded-2xl bg-primary p-5 shadow-lg space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-text">Bot IA</h2>
                <p className="text-xs text-text-secondary">
                  Usuario especial con rol <code>bot_agent</code>. Solo admin_sistema puede crearlo.
                </p>
              </div>
              {!showBotForm ? (
                <button
                  type="button"
                  onClick={() => setShowBotForm(true)}
                  className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-text transition hover:bg-primary"
                >
                  Nuevo bot
                </button>
              ) : null}
            </div>

            {botError && (
              <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{botError}</div>
            )}
            {botNotice && (
              <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{botNotice}</div>
            )}

            {/* Formulario de registro */}
            {showBotForm ? (
              <div className="grid gap-2 rounded-lg border border-[#C9A961]/30 bg-[#FFF9F0] p-3 md:grid-cols-3">
                <input
                  value={botForm.nombre}
                  onChange={(e) => setBotForm((p) => ({ ...p, nombre: e.target.value }))}
                  placeholder="Nombre del bot"
                  className="rounded border border-[#C9A961]/40 px-2 py-2 text-sm text-[#3D1B1F]"
                />
                <input
                  value={botForm.email}
                  onChange={(e) => setBotForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="Email"
                  type="email"
                  className="rounded border border-[#C9A961]/40 px-2 py-2 text-sm text-[#3D1B1F]"
                />
                <input
                  value={botForm.password}
                  onChange={(e) => setBotForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Password"
                  type="password"
                  className="rounded border border-[#C9A961]/40 px-2 py-2 text-sm text-[#3D1B1F]"
                />
                <div className="md:col-span-3 flex gap-2">
                  <button
                    type="button"
                    disabled={botSaving}
                    onClick={() => void onRegisterBot()}
                    className="rounded border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-[#722F37] disabled:opacity-60"
                  >
                    {botSaving ? "Creando..." : "Crear bot"}
                  </button>
                  <button
                    type="button"
                    disabled={botSaving}
                    onClick={() => { setShowBotForm(false); setBotForm({ nombre: "", email: "", password: "" }); setBotError(null); }}
                    className="rounded border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : null}

            {/* Lista de bots registrados */}
            {botsLoading ? (
              <div className="text-xs text-text-secondary">Cargando bots…</div>
            ) : bots.length === 0 ? (
              <div className="text-xs text-text-secondary">No hay bots registrados todavía.</div>
            ) : (
              <div className="space-y-2">
                {bots.map((bot) => (
                  <div
                    key={bot.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] px-4 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">Bot</span>
                        <span className="text-sm font-semibold text-[#3D1B1F]">{bot.nombre}</span>
                        <span className={["rounded-full px-2 py-0.5 text-xs font-semibold", bot.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"].join(" ")}>
                          {bot.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-[#7A4A50]">{bot.email ?? "Sin email"}</div>
                    </div>
                    <div className="flex items-center gap-1 rounded border border-[#C9A961]/30 bg-[#FFF9F0] px-2 py-1">
                      <span className="font-mono text-xs text-[#7A4A50] select-all">{bot.id}</span>
                      <button
                        type="button"
                        title="Copiar ID"
                        onClick={() => void navigator.clipboard.writeText(bot.id).then(() => setBotNotice("ID copiado."))}
                        className="ml-1 text-[#C9A961] hover:text-[#722F37] text-xs"
                      >
                        copiar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {/* ─── Mis delegaciones ─── */}
        <section className="rounded-2xl bg-primary p-5 shadow-lg space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text">Mis delegaciones</h2>
              <p className="text-xs text-text-secondary">
                Accesos que le otorgaste al bot IA para actuar en tu nombre.
              </p>
            </div>
            <button
              type="button"
              onClick={openDelForm}
              className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-text transition hover:bg-primary"
            >
              Nueva delegación
            </button>
          </div>

          {delError && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{delError}</div>
          )}
          {delNotice && (
            <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{delNotice}</div>
          )}

          {/* Formulario nueva delegación */}
          {showDelForm ? (
            <div className="rounded-lg border border-[#C9A961]/30 bg-[#FFF9F0] p-4 space-y-3">
              <p className="text-xs font-semibold text-[#6B3A3F]">Nueva delegación</p>

              {/* Bot */}
              <div>
                <label className="block mb-1 text-xs text-[#6B3A3F]">Bot</label>
                {botsLoading ? (
                  <div className="text-xs text-text-secondary py-2">Cargando bots…</div>
                ) : bots.length === 0 ? (
                  <div className="text-xs text-[#7A4A50] py-2">No hay bots registrados. Pedile al admin_sistema que registre uno.</div>
                ) : (
                  <select
                    value={delForm.botUserId}
                    onChange={(e) => setDelForm((p) => ({ ...p, botUserId: e.target.value }))}
                    className="w-full rounded border border-[#C9A961]/40 px-2 py-2 text-sm text-[#3D1B1F]"
                  >
                    <option value="">Seleccionar bot</option>
                    {bots.map((bot) => (
                      <option key={bot.id} value={bot.id}>{bot.nombre} ({bot.email})</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Bodega */}
              <div>
                <label className="block mb-1 text-xs text-[#6B3A3F]">Bodega (opcional — vacío = todas)</label>
                <select
                  value={delForm.bodegaId}
                  onChange={(e) => setDelForm((p) => ({ ...p, bodegaId: e.target.value }))}
                  className="w-full rounded border border-[#C9A961]/40 px-2 py-2 text-sm text-[#3D1B1F]"
                >
                  <option value="">Todas mis bodegas</option>
                  {bodegas.map((b) => (
                    <option key={b.bodega_id} value={b.bodega_id}>{b.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Scopes */}
              <div>
                <label className="block mb-1 text-xs text-[#6B3A3F]">Permisos (scopes)</label>
                <div className="flex flex-wrap gap-3 rounded border border-[#C9A961]/30 bg-white p-2">
                  {BOT_SCOPES.map((scope) => {
                    const checked = delForm.scopes.includes(scope);
                    return (
                      <label key={scope} className="flex items-center gap-2 text-xs text-[#3D1B1F]">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setDelForm((p) => ({
                              ...p,
                              scopes: e.target.checked
                                ? Array.from(new Set([...p.scopes, scope]))
                                : p.scopes.filter((s) => s !== scope),
                            }))
                          }
                        />
                        <span>
                          <span className="font-mono text-[10px] text-[#C9A961]">{scope}</span>
                          <span className="block text-[#7A4A50]">{BOT_SCOPE_LABELS[scope]}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Vencimiento */}
              <div>
                <label className="block mb-1 text-xs text-[#6B3A3F]">Vencimiento (opcional)</label>
                <input
                  type="datetime-local"
                  value={delForm.expiresAt}
                  onChange={(e) => setDelForm((p) => ({ ...p, expiresAt: e.target.value }))}
                  className="rounded border border-[#C9A961]/40 px-2 py-2 text-sm text-[#3D1B1F]"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={delSaving}
                  onClick={() => void onCreateDelegation()}
                  className="rounded border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-[#722F37] disabled:opacity-60"
                >
                  {delSaving ? "Guardando..." : "Crear delegación"}
                </button>
                <button
                  type="button"
                  disabled={delSaving}
                  onClick={() => { setShowDelForm(false); setDelError(null); }}
                  className="rounded border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 disabled:opacity-60"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : null}

          {/* Tabla de delegaciones */}
          {delegationsLoading ? (
            <div className="text-sm text-text-secondary">Cargando delegaciones…</div>
          ) : delegations.length === 0 ? (
            <div className="text-sm text-text-secondary">No tenés delegaciones activas.</div>
          ) : (
            <div className="space-y-2">
              {delegations.map((d) => (
                <article
                  key={d.bot_delegation_id}
                  className="rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-[#3D1B1F]">
                        {getBodegaName(d.bodega_id)}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {d.scopes.map((s) => (
                          <span
                            key={s}
                            className="rounded bg-[#F3E8CC] px-1.5 py-0.5 font-mono text-[10px] text-[#7A4A50]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs text-[#7A4A50]">
                        {d.expires_at
                          ? `Vence: ${new Date(d.expires_at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}`
                          : "Sin vencimiento"}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={revokingId === d.bot_delegation_id}
                      onClick={() => void onRevoke(d.bot_delegation_id)}
                      className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 disabled:opacity-60"
                    >
                      {revokingId === d.bot_delegation_id ? "Revocando..." : "Revocar"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Integraciones;
