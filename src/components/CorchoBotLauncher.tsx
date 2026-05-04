import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Bot, MessageSquare, Send, Sparkles, X } from "lucide-react";
import { AppButton, AppModal, AppTextarea, NoticeBanner } from "./ui";
import { useAuthStore } from "../store/authStore";
import { consultarIa } from "../features/ia/api";
import { getApiErrorMessage } from "../lib/api";

type CorchoBotMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

type RouteProfile = {
  label: string;
  summary: string;
  suggestions: string[];
};

function getRouteProfile(pathname: string): RouteProfile {
  if (pathname.startsWith("/ordenes")) {
    return {
      label: "Órdenes de trabajo",
      summary: "Puedo ayudarte a crear, asignar y seguir órdenes sin mezclarlo con la carga técnica del registro operativo.",
      suggestions: [
        "¿Cómo conviene ordenar las órdenes de hoy?",
        "¿Qué significa cada estado de una orden?",
        "Ayudame a decidir a quién asignar este trabajo",
      ],
    };
  }

  if (pathname.startsWith("/operacion")) {
    return {
      label: "Operación",
      summary: "Puedo orientarte en ingreso de uva, CIU, vasijas, cortes, fraccionamiento y cómo ordenar mejor el trabajo operativo.",
      suggestions: [
        "Explicame el flujo operativo de esta sección",
        "¿Qué datos conviene cargar primero acá?",
        "¿Cómo ordeno mejor este flujo?",
      ],
    };
  }

  if (pathname.startsWith("/setup")) {
    return {
      label: "Setup",
      summary: "Puedo guiarte para dejar bien armado el contexto base: finca, campaña, cuarteles y protocolo.",
      suggestions: [
        "¿Qué debería configurar antes de crear un proceso?",
        "Revisá si me falta algo en el setup",
        "Explicame el orden correcto del alta inicial",
      ],
    };
  }

  if (pathname.startsWith("/fincas")) {
    return {
      label: "Fincas",
      summary: "Puedo ayudarte a revisar estructura productiva, cuarteles y qué información conviene completar para operar mejor.",
      suggestions: [
        "¿Qué información productiva falta completar acá?",
        "Ayudame a revisar esta finca",
        "¿Cómo debería estructurar los cuarteles?",
      ],
    };
  }

  if (pathname.startsWith("/usuarios") || pathname.startsWith("/integraciones")) {
    return {
      label: "Administración",
      summary: "Puedo ayudarte a ordenar permisos, usuarios, bots e integraciones para que el equipo trabaje más prolijo.",
      suggestions: [
        "¿Cómo conviene organizar usuarios y roles?",
        "Revisá si esta configuración tiene sentido",
        "¿Qué debería delegar a bots o automatizaciones?",
      ],
    };
  }

  return {
    label: "Traza",
    summary: "Puedo orientarte sobre el flujo actual de la plataforma y ayudarte a decidir qué completar o mejorar primero.",
    suggestions: [
      "Explicame qué debería hacer ahora",
      "¿Qué módulo conviene revisar primero?",
      "Ayudame a priorizar lo que falta",
    ],
  };
}

function buildAssistantReply(prompt: string, pathname: string, bodegaName?: string | null) {
  const profile = getRouteProfile(pathname);
  const normalized = prompt.toLowerCase();
  const bodegaContext = bodegaName ? ` en ${bodegaName}` : "";

  if (normalized.includes("cerrar") || normalized.includes("falta")) {
    return `Si el objetivo es cerrar bien el flujo${bodegaContext}, yo revisaría primero los pendientes obligatorios de ${profile.label.toLowerCase()}, después las tareas abiertas y por último los registros que todavía no tienen respaldo claro. Si querés, en la siguiente iteración puedo darte este chequeo conectado a datos reales.`;
  }

  if (normalized.includes("protocolo") || normalized.includes("etapa") || normalized.includes("proceso")) {
    return `En esta sección de ${profile.label.toLowerCase()} conviene pensar el protocolo como una secuencia: contexto -> carga operativa -> validación -> cierre. Mi sugerencia es que priorices siempre las etapas obligatorias y uses los opcionales como apoyo documental, no como bloqueo.`;
  }

  if (
    normalized.includes("operacion")
    || normalized.includes("recepcion")
    || normalized.includes("vasija")
    || normalized.includes("fraccionamiento")
  ) {
    return `Desde operación, la mejor práctica es cargar primero lo estructural del movimiento y después completar controles y observaciones. Así mantenés trazabilidad limpia sin frenar al equipo por datos accesorios.`;
  }

  if (normalized.includes("usuario") || normalized.includes("rol") || normalized.includes("permiso")) {
    return `Para usuarios y permisos, te recomendaría mantener la operación diaria con roles acotados y reservar administración para pocos perfiles. Eso hace que la app sea más clara y reduce errores de carga.`;
  }

  return `Veo que estás en ${profile.label}${bodegaContext}. ${profile.summary} Si querés, puedo ayudarte a convertir esta consulta en una sugerencia más accionable para esta pantalla.`;
}

function buildBackendReply(
  response: Awaited<ReturnType<typeof consultarIa>>,
  pathname: string,
  bodegaName?: string | null,
) {
  const profile = getRouteProfile(pathname);
  const results = response.resultados ?? {};
  const highlights: string[] = [];

  if ((results.trazabilidades?.length ?? 0) > 0) {
    const top = results.trazabilidades?.slice(0, 2).map((item) => item.nombre_producto).filter(Boolean);
    if (top?.length) highlights.push(`Trazabilidades: ${top.join(", ")}`);
  }
  if ((results.fincas?.length ?? 0) > 0) {
    const top = results.fincas?.slice(0, 2).map((item) => item.nombre_finca).filter(Boolean);
    if (top?.length) highlights.push(`Fincas: ${top.join(", ")}`);
  }
  if ((results.cuarteles?.length ?? 0) > 0) {
    const top = results.cuarteles?.slice(0, 2).map((item) => item.codigo_cuartel).filter(Boolean);
    if (top?.length) highlights.push(`Cuarteles: ${top.join(", ")}`);
  }
  if ((results.hallazgos?.length ?? 0) > 0) {
    const top = results.hallazgos?.slice(0, 2).map((item) => item.titulo).filter(Boolean);
    if (top?.length) highlights.push(`Hallazgos: ${top.join(", ")}`);
  }

  return [
    `CorchoBot encontró contexto real en ${profile.label.toLowerCase()}${bodegaName ? ` para ${bodegaName}` : ""}.`,
    response.resumen,
    highlights.length ? highlights.join(" · ") : "No hubo resultados concretos para resumir más allá del contexto general.",
  ].join(" ");
}

function createWelcomeMessage(pathname: string, bodegaName?: string | null): CorchoBotMessage {
  const profile = getRouteProfile(pathname);
  const bodegaContext = bodegaName ? ` para ${bodegaName}` : "";

  return {
    id: "welcome",
    role: "assistant",
    content: `Soy CorchoBot. Estoy listo para ayudarte${bodegaContext} en ${profile.label.toLowerCase()}. ${profile.summary}`,
  };
}

export default function CorchoBotLauncher() {
  const location = useLocation();
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const bodegas = useAuthStore((state) => state.bodegas) ?? [];
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeBodegaName = useMemo(
    () => (Array.isArray(bodegas)
      ? bodegas.find((item) => String(item?.bodega_id ?? "") === String(activeBodegaId ?? ""))?.nombre ?? null
      : null),
    [activeBodegaId, bodegas],
  );
  const routeProfile = useMemo(() => getRouteProfile(location.pathname), [location.pathname]);
  const [opened, setOpened] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState<"test" | "live">("test");
  const [messages, setMessages] = useState<CorchoBotMessage[]>(() => [
    createWelcomeMessage(location.pathname, activeBodegaName),
  ]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages([createWelcomeMessage(location.pathname, activeBodegaName)]);
    setDraft("");
  }, [activeBodegaName, location.pathname]);

  useEffect(() => {
    if (!opened) return;
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, opened]);

  const submitPrompt = async (promptText?: string) => {
    const nextPrompt = (promptText ?? draft).trim();
    if (!nextPrompt) return;

    const userMessage: CorchoBotMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: nextPrompt,
    };
    setMessages((current) => [...current, userMessage]);
    setDraft("");

    setSending(true);
    try {
      const response = await consultarIa({
        pregunta: nextPrompt,
        bodegaId: activeBodegaId ? String(activeBodegaId) : null,
        limit: 3,
      });
      setMode("live");
      const assistantMessage: CorchoBotMessage = {
        id: `assistant-${Date.now() + 1}`,
        role: "assistant",
        content: buildBackendReply(response, location.pathname, activeBodegaName),
      };
      setMessages((current) => [...current, assistantMessage]);
    } catch (error) {
      setMode("test");
      const reason = getApiErrorMessage(error);
      const assistantMessage: CorchoBotMessage = {
        id: `assistant-${Date.now() + 1}`,
        role: "assistant",
        content: `${buildAssistantReply(nextPrompt, location.pathname, activeBodegaName)}${reason ? " Estoy respondiendo en modo test porque la consulta en vivo no estuvo disponible para este usuario." : ""}`,
      };
      setMessages((current) => [...current, assistantMessage]);
    } finally {
      setSending(false);
    }
  };

  if (!mounted) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpened(true)}
        className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-3 rounded-[var(--radius-xl)] border border-[color:var(--border-shell)] bg-[color:var(--action-secondary-bg)] px-4 py-3 text-left text-[color:var(--text-on-dark)] shadow-[var(--shadow-raised)] transition-all duration-[var(--motion-fast)] ease-[var(--motion-standard)] hover:-translate-y-0.5 hover:border-[color:var(--border-default)] hover:bg-[color:var(--action-secondary-hover)] sm:bottom-6 sm:right-6"
        aria-label="Abrir CorchoBot"
      >
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--accent-primary)] text-[color:var(--text-primary)] shadow-[var(--shadow-inset-soft)]">
          <Bot className="h-5 w-5" />
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="flex items-center gap-2 text-sm font-semibold leading-none">
            CorchoBot
            <Sparkles className="h-3.5 w-3.5 text-[color:var(--accent-secondary)]" />
          </span>
          <span className="mt-1 block text-xs text-[color:var(--text-ink-muted)]">
            Asistente contextual de Traza
          </span>
        </span>
      </button>

      {opened ? (
        <AppModal
          opened={opened}
          onClose={() => setOpened(false)}
          size="lg"
          title={(
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--accent-primary)] text-[color:var(--text-primary)]">
                <Bot className="h-5 w-5" />
              </span>
              <div>
                <div className="text-lg font-semibold">CorchoBot</div>
                <div className="text-xs text-[color:var(--text-ink-muted)]">
                  Asistente piloto para ayudarte a navegar y operar mejor la plataforma.
                </div>
              </div>
            </div>
          )}
          description={`Contexto actual: ${routeProfile.label}${activeBodegaName ? ` · ${activeBodegaName}` : ""}`}
          showHeaderDivider
          footer={(
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-[color:var(--text-ink-muted)]">
                {mode === "live" ? "Conectado a consulta IA de prueba." : "Modo test contextual activo."}
              </div>
              <div className="flex items-center gap-2">
                <AppButton variant="secondary" onClick={() => setOpened(false)} leftSection={<X className="h-4 w-4" />}>
                  Cerrar
                </AppButton>
                <AppButton
                  variant="primary"
                  onClick={() => void submitPrompt()}
                  disabled={!draft.trim() || sending}
                  loading={sending}
                  leftSection={<Send className="h-4 w-4" />}
                >
                  Enviar
                </AppButton>
              </div>
            </div>
          )}
        >
          <div className="space-y-5">
            <NoticeBanner tone={mode === "live" ? "success" : "info"} title={mode === "live" ? "Modo conectado" : "Modo test"}>
              Podés hacerle preguntas sobre el flujo actual, pedir ayuda para completar una pantalla o usar una sugerencia rápida según el módulo en el que estás.
            </NoticeBanner>

            <div className="flex flex-wrap gap-2">
              {routeProfile.suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void submitPrompt(suggestion)}
                  className="rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--action-secondary-bg)] px-3 py-2 text-xs font-medium text-[color:var(--text-on-dark)] transition hover:border-[color:var(--border-default)] hover:bg-[color:var(--action-secondary-hover)]"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <div className="rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-shell)]">
              <div className="max-h-[320px] space-y-3 overflow-y-auto px-4 py-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={[
                        "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                        message.role === "user"
                          ? "bg-[color:var(--accent-primary)] text-[color:var(--text-primary)]"
                          : "border border-[color:var(--border-subtle)] bg-[color:var(--surface-muted)] text-[color:var(--text-ink)]",
                      ].join(" ")}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </div>

            <AppTextarea
              label="Tu consulta"
              description="Probá pedir un siguiente paso, una priorización o una explicación del flujo actual."
              placeholder="Ej.: ¿Qué me falta para completar este flujo?"
              value={draft}
              onChange={(event) => setDraft(event.currentTarget.value)}
              uiSize="md"
            />

            <div className="flex items-center gap-2 text-xs text-[color:var(--text-ink-muted)]">
              <MessageSquare className="h-4 w-4" />
              {mode === "live"
                ? "CorchoBot está consultando el endpoint de IA de prueba y combinándolo con el contexto de la pantalla."
                : "CorchoBot está respondiendo en modo test local cuando la consulta en vivo no aplica o no está disponible."}
            </div>
          </div>
        </AppModal>
      ) : null}
    </>
  );
}
