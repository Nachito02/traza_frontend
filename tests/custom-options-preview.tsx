import { useState } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "../src/index.css";
import AppSelectWithOther from "../src/components/ui/AppSelectWithOther";
import { serializeCustomFields } from "../src/lib/customOptions";

const field = { name: "metodo", label: "Método de aplicación", allowOther: true, required: true, options: [{ value: "foliar", label: "Foliar" }, { value: "fertirriego", label: "Fertirriego" }] };
function Preview() {
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  return <MantineProvider><main style={{ maxWidth: 640, padding: 24, margin: "auto" }}>
    <h1>Opciones personalizadas</h1>
    <p>Prueba local: no guarda datos en el servidor.</p>
    <AppSelectWithOther label={field.label} value={value} options={field.options} onChange={setValue} otherLabel="Especificá el método" required />
    <button onClick={() => { try { setSaved(serializeCustomFields({ metodo: value }, [field]).metodo); setError(""); } catch (e) { setError((e as Error).message); } }}>Probar guardado</button>
    <button onClick={() => setValue(saved)}>Restaurar guardado</button>
    <p role="status">{error || (saved ? `Guardado: ${saved}` : "Sin guardar")}</p>
  </main></MantineProvider>;
}
createRoot(document.getElementById("root")!).render(<Preview />);
