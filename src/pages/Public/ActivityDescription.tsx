import { EVENTO_CONFIG } from "../Trazabilidad/eventoConfig";
import { describeActivity } from "./activityPresentation";

export function ActivityDescription({ text, eventType }: { text: string | null; eventType?: string }) {
  const { text: note, details } = describeActivity(text, EVENTO_CONFIG[eventType ?? ""]?.fields);
  if (!note && details.length === 0) return null;
  return (
    <div style={{ marginBottom: 10, fontSize: 13, color: "#4a6080", lineHeight: 1.6, overflowWrap: "anywhere" }}>
      {note && <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{note}</p>}
      {details.length > 0 && (
        <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 12, margin: "8px 0" }}>
          {details.map((detail, index) => (
            <div key={`${detail.label}-${index}`} style={{ borderLeft: "2px solid #d9e3ed", paddingLeft: 10 }}>
              <dt style={{ fontSize: 11, color: "#4a6080" }}>{detail.label}</dt>
              <dd style={{ margin: "2px 0 0", color: "#07135f", fontWeight: 600, whiteSpace: "pre-wrap" }}>{detail.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
