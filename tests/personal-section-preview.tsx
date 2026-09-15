import { useState } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "../src/index.css";
import PersonalSection from "../src/pages/Costos/PersonalSection";
import type { Personal } from "../src/features/personal/api";
import type { TransitorioDraft } from "../src/pages/Costos/transitorios";

/** Mismo elenco que siembra seed-personal.sql, para ver los casos reales de costo. */
const base = { bodega_id: "b", user_id: null, fecha_ingreso: null, antiguedad_anios: null, activo: true };
const PERSONAL: Personal[] = [
  { ...base, personal_bodega_id: "1", nombre: "Ramón Quiroga", legajo: "DEMO-001", tipo: "interno", modalidad: "mensual", rol: "encargado", sueldo_mensual: "1200000", costo_hora: null, costo_unitario: null, dias_mes: 25, costo_hora_efectivo: 6000 },
  { ...base, personal_bodega_id: "2", nombre: "Marta Sosa", legajo: "DEMO-002", tipo: "interno", modalidad: "mensual", rol: "tecnico", sueldo_mensual: "1440000", costo_hora: null, costo_unitario: null, dias_mes: 30, costo_hora_efectivo: 6000 },
  { ...base, personal_bodega_id: "3", nombre: "Luis Paredes", legajo: "DEMO-003", tipo: "interno", modalidad: "mensual", rol: "tractorista", sueldo_mensual: "960000", costo_hora: null, costo_unitario: null, dias_mes: 25, costo_hora_efectivo: 4800 },
  { ...base, personal_bodega_id: "4", nombre: "Juana Ferreyra", legajo: "DEMO-004", tipo: "interno", modalidad: "por_hora", rol: "operario", sueldo_mensual: null, costo_hora: "4500", costo_unitario: null, dias_mes: 25, costo_hora_efectivo: 4500 },
  { ...base, personal_bodega_id: "5", nombre: "Diego Molina", legajo: "DEMO-005", tipo: "externo", modalidad: "por_hora", rol: "aplicador", sueldo_mensual: null, costo_hora: "7200", costo_unitario: null, dias_mes: 25, costo_hora_efectivo: 7200 },
  { ...base, personal_bodega_id: "6", nombre: "Cuadrilla Pérez", legajo: "DEMO-006", tipo: "externo", modalidad: "al_tanto", rol: "contratista", sueldo_mensual: null, costo_hora: null, costo_unitario: "850", dias_mes: 25, costo_hora_efectivo: 0 },
  { ...base, personal_bodega_id: "7", nombre: "Silvio Arce", legajo: "DEMO-007", tipo: "externo", modalidad: "otro", rol: "operario", sueldo_mensual: null, costo_hora: null, costo_unitario: "1200", dias_mes: 25, costo_hora_efectivo: 0 },
  { ...base, personal_bodega_id: "9", nombre: "Ana Villalba", legajo: "DEMO-009", tipo: "interno", modalidad: "por_hora", rol: null, sueldo_mensual: null, costo_hora: null, costo_unitario: null, dias_mes: 25, costo_hora_efectivo: 0 },
];

function Preview() {
  const [personal, setPersonal] = useState<Record<string, string>>({ "3": "6" });
  const [query, setQuery] = useState("");
  const [transitorios, setTransitorios] = useState<TransitorioDraft[]>([]);
  const horas = Object.values(personal).reduce((a, h) => a + (Number(h) || 0), 0);

  return (
    <MantineProvider>
      <main style={{ maxWidth: 780, padding: 24, margin: "auto" }}>
        <h1 style={{ fontSize: 18, marginBottom: 4 }}>Personal asignado — preview</h1>
        <p style={{ fontSize: 13, opacity: 0.7 }}>Datos de muestra, no toca el servidor.</p>
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 20, marginTop: 16 }}>
          <PersonalSection
            personalList={PERSONAL}
            personal={personal}
            setPersonal={setPersonal}
            personalQuery={query}
            setPersonalQuery={setQuery}
            transitorios={transitorios}
            setTransitorios={setTransitorios}
            horasHombre={horas}
            jornalesAuto={Math.round((horas / 8) * 100) / 100}
          />
        </div>
      </main>
    </MantineProvider>
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
