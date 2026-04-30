import { useEffect, useMemo, useState } from "react";
import {
  AppButton,
  AppCard,
  AppInput,
  AppSelect,
  NoticeBanner,
  SectionIntro,
} from "../../components/ui";
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
        <SectionIntro
          title="Bots"
          description="Gestioná bots y delegaciones de acceso."
        />

        {/* ─── Panel del Bot (solo admin_sistema) ─── */}
        {isAdminSistema ? (
          <AppCard
            as="section"
            padding="md"
            header={(
              <SectionIntro
                title="Bot IA"
                description={<>Usuario especial con rol <code>bot_agent</code>. Solo admin_sistema puede crearlo.</>}
                actions={
                  !showBotForm ? (
                    <AppButton type="button" variant="secondary" size="sm" onClick={() => setShowBotForm(true)}>
                      Nuevo bot
                    </AppButton>
                  ) : null
                }
              />
            )}
          >

            {botError && <NoticeBanner tone="danger">{botError}</NoticeBanner>}
            {botNotice && <NoticeBanner tone="success">{botNotice}</NoticeBanner>}

            {/* Formulario de registro */}
            {showBotForm ? (
              <div className="grid gap-2 rounded-[var(--radius-lg)] border border-[color:var(--border-default)] bg-[color:var(--surface-soft)] p-3 md:grid-cols-3">
                <AppInput
                  value={botForm.nombre}
                  onChange={(e) => setBotForm((p) => ({ ...p, nombre: e.target.value }))}
                  placeholder="Nombre del bot"
                />
                <AppInput
                  value={botForm.email}
                  onChange={(e) => setBotForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="Email"
                  type="email"
                />
                <AppInput
                  value={botForm.password}
                  onChange={(e) => setBotForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Password"
                  type="password"
                />
                <div className="md:col-span-3 flex gap-2">
                  <AppButton type="button" variant="secondary" size="sm" disabled={botSaving} onClick={() => void onRegisterBot()}>
                    {botSaving ? "Creando..." : "Crear bot"}
                  </AppButton>
                  <AppButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={botSaving}
                    onClick={() => { setShowBotForm(false); setBotForm({ nombre: "", email: "", password: "" }); setBotError(null); }}
                  >
                    Cancelar
                  </AppButton>
                </div>
              </div>
            ) : null}

            {/* Lista de bots registrados */}
            {botsLoading ? (
              <NoticeBanner>Cargando bots…</NoticeBanner>
            ) : bots.length === 0 ? (
              <NoticeBanner>No hay bots registrados todavía.</NoticeBanner>
            ) : (
              <div className="space-y-2">
                {bots.map((bot) => (
                  <div
                    key={bot.id}
                    className="flex flex-wrap items-center gap-3 rounded-[var(--radius-xl)] border border-[color:var(--border-default)] bg-[color:var(--surface-soft)] px-4 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-2 py-0.5 text-xs font-semibold text-[color:var(--accent-secondary)]">
                          Bot
                        </span>
                        <span className="text-sm font-semibold text-[color:var(--text-ink)]">{bot.nombre}</span>
                        <span
                          className={[
                            "rounded-full border px-2 py-0.5 text-xs font-semibold",
                            bot.is_active
                              ? "border-[color:var(--feedback-success-border)] bg-[color:var(--feedback-success-bg)] text-[color:var(--feedback-success-text)]"
                              : "border-[color:var(--feedback-neutral-border)] bg-[color:var(--feedback-neutral-bg)] text-[color:var(--feedback-neutral-text)]",
                          ].join(" ")}
                        >
                          {bot.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-[color:var(--text-ink-muted)]">{bot.email ?? "Sin email"}</div>
                    </div>
                    <div className="flex items-center gap-1 rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-2 py-1">
                      <span className="select-all font-mono text-xs text-[color:var(--text-ink-muted)]">{bot.id}</span>
                      <button
                        type="button"
                        title="Copiar ID"
                        onClick={() => void navigator.clipboard.writeText(bot.id).then(() => setBotNotice("ID copiado."))}
                        className="ml-1 rounded-[var(--radius-sm)] border border-transparent px-2 py-1 text-xs font-semibold text-[color:var(--text-on-dark)] transition hover:border-[color:var(--border-default)] hover:bg-[color:var(--action-secondary-hover)]"
                      >
                        copiar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AppCard>
        ) : null}

        {/* ─── Mis delegaciones ─── */}
        <AppCard
          as="section"
          padding="md"
          header={(
            <SectionIntro
              title="Mis delegaciones"
              description="Accesos que le otorgaste al bot IA para actuar en tu nombre."
              actions={(
                <AppButton type="button" variant="secondary" size="sm" onClick={openDelForm}>
                  Nueva delegación
                </AppButton>
              )}
            />
          )}
        >

          {delError && <NoticeBanner tone="danger">{delError}</NoticeBanner>}
          {delNotice && <NoticeBanner tone="success">{delNotice}</NoticeBanner>}

          {/* Formulario nueva delegación */}
          {showDelForm ? (
            <div className="space-y-3 rounded-[var(--radius-lg)] border border-[color:var(--border-default)] bg-[color:var(--surface-soft)] p-4">
              <p className="text-xs font-semibold text-[color:var(--text-accent)]">Nueva delegación</p>

              {/* Bot */}
              <div>
                <label className="mb-1 block text-xs text-[color:var(--text-accent)]">Bot</label>
                {botsLoading ? (
                  <div className="text-xs text-text-secondary py-2">Cargando bots…</div>
                ) : bots.length === 0 ? (
                  <div className="py-2 text-xs text-[color:var(--text-ink-muted)]">No hay bots registrados. Pedile al admin_sistema que registre uno.</div>
                ) : (
                  <AppSelect
                    value={delForm.botUserId}
                    onChange={(e) => setDelForm((p) => ({ ...p, botUserId: e.target.value }))}
                  >
                    <option value="">Seleccionar bot</option>
                    {bots.map((bot) => (
                      <option key={bot.id} value={bot.id}>{bot.nombre} ({bot.email})</option>
                    ))}
                  </AppSelect>
                )}
              </div>

              {/* Bodega */}
              <div>
                <label className="mb-1 block text-xs text-[color:var(--text-accent)]">Bodega (opcional — vacío = todas)</label>
                <AppSelect
                  value={delForm.bodegaId}
                  onChange={(e) => setDelForm((p) => ({ ...p, bodegaId: e.target.value }))}
                >
                  <option value="">Todas mis bodegas</option>
                  {bodegas.map((b) => (
                    <option key={b.bodega_id} value={b.bodega_id}>{b.nombre}</option>
                  ))}
                </AppSelect>
              </div>

              {/* Scopes */}
              <div>
                <label className="mb-1 block text-xs text-[color:var(--text-accent)]">Permisos (scopes)</label>
                <div className="flex flex-wrap gap-3 rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] p-2">
                  {BOT_SCOPES.map((scope) => {
                    const checked = delForm.scopes.includes(scope);
                    return (
                      <label key={scope} className="flex items-center gap-2 text-xs text-[color:var(--text-on-dark)]">
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
                          <span className="font-mono text-[10px] text-[color:var(--accent-secondary)]">{scope}</span>
                          <span className="block text-[color:var(--text-on-dark-muted)]">{BOT_SCOPE_LABELS[scope]}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Vencimiento */}
              <div>
                <label className="mb-1 block text-xs text-[color:var(--text-accent)]">Vencimiento (opcional)</label>
                <AppInput
                  type="datetime-local"
                  value={delForm.expiresAt}
                  onChange={(e) => setDelForm((p) => ({ ...p, expiresAt: e.target.value }))}
                />
              </div>

              <div className="flex gap-2">
                <AppButton type="button" variant="secondary" size="sm" disabled={delSaving} onClick={() => void onCreateDelegation()}>
                  {delSaving ? "Guardando..." : "Crear delegación"}
                </AppButton>
                <AppButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={delSaving}
                  onClick={() => { setShowDelForm(false); setDelError(null); }}
                >
                  Cancelar
                </AppButton>
              </div>
            </div>
          ) : null}

          {/* Tabla de delegaciones */}
          {delegationsLoading ? (
            <NoticeBanner>Cargando delegaciones…</NoticeBanner>
          ) : delegations.length === 0 ? (
            <div className="rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-5 py-4 text-sm text-[color:var(--text-on-dark-muted)]">
              No tenés delegaciones activas.
            </div>
          ) : (
            <div className="space-y-2">
              {delegations.map((d) => (
                <AppCard
                  key={d.bot_delegation_id}
                  as="article"
                  tone="soft"
                  padding="sm"
                  className="bg-[color:var(--surface-soft)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-[color:var(--text-ink)]">
                        {getBodegaName(d.bodega_id)}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {d.scopes.map((s) => (
                          <span
                            key={s}
                            className="rounded-[var(--radius-sm)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-1.5 py-0.5 font-mono text-[10px] text-[color:var(--text-on-dark-muted)]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs text-[color:var(--text-ink-muted)]">
                        {d.expires_at
                          ? `Vence: ${new Date(d.expires_at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}`
                          : "Sin vencimiento"}
                      </div>
                    </div>
                    <AppButton
                      type="button"
                      variant="danger"
                      size="sm"
                      disabled={revokingId === d.bot_delegation_id}
                      onClick={() => void onRevoke(d.bot_delegation_id)}
                    >
                      {revokingId === d.bot_delegation_id ? "Revocando..." : "Revocar"}
                    </AppButton>
                  </div>
                </AppCard>
              ))}
            </div>
          )}
        </AppCard>
      </div>
    </div>
  );
};

export default Integraciones;
