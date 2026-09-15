import { useState } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import AppModal from "../src/components/ui/AppModal";
import "@mantine/core/styles.css";
import "../src/index.css";
import InsumoPicker from "../src/pages/Costos/InsumoPicker";
import type { InsumoCatalogo } from "../src/features/costos/api";
import type { Existencia } from "../src/features/inventario/api";

const TIPOS = ["fertilizante", "fitosanitario", "organico", "coadyuvante", "enologico", "limpieza", "epp", "riego"];
const PA = ["Glifosato", "Nitrógeno (N)", "Fósforo (P)", "Azufre", "Cobre", "Imidacloprid", null];

// ~200 insumos: el escenario real que rompía el select nativo.
const INSUMOS: InsumoCatalogo[] = Array.from({ length: 200 }, (_, n) => ({
  insumo_id: `i${n}`,
  bodega_id: "b1",
  tipo: TIPOS[n % TIPOS.length],
  familia: n % 3 === 0 ? "Nitrogenado" : null,
  ambito: "finca",
  nombre_comercial: `Producto ${String(n).padStart(3, "0")} ${n % 7 === 0 ? "de nombre comercial bastante largo" : ""}`.trim(),
  principio_activo: PA[n % PA.length],
  costo_unitario: "100",
  unidad_base: n % 2 ? "kg" : "l",
  moneda: "ARS",
}));
// Casos con nombre real para probar la búsqueda por principio activo y sin tildes.
INSUMOS[3] = { ...INSUMOS[3], nombre_comercial: "Roundup Full", principio_activo: "Glifosato", tipo: "fitosanitario" };
INSUMOS[4] = { ...INSUMOS[4], nombre_comercial: "Glifosato 48 SL", principio_activo: "Glifosato", tipo: "fitosanitario" };
INSUMOS[5] = { ...INSUMOS[5], nombre_comercial: "Superfosfato", principio_activo: "Fósforo (P)", tipo: "fertilizante" };

// Existencias parciales a propósito: hay con stock, en 0, y ausentes del mapa.
const EXISTENCIAS: Record<string, Existencia> = {};
INSUMOS.forEach((i, n) => {
  if (n % 3 === 2) return; // ausentes -> "sin stock registrado"
  EXISTENCIAS[i.insumo_id] = {
    insumo_id: i.insumo_id, nombre_comercial: i.nombre_comercial, tipo: i.tipo,
    unidad_base: i.unidad_base, costo_unitario: i.costo_unitario,
    stock: n % 5 === 0 ? 0 : 10 + n, stock_minimo: null, valorizacion: 0, bajo_minimo: false,
  };
});

function Preview() {
  const [msg, setMsg] = useState("");
  const [modal, setModal] = useState(false);
  const [agregados, setAgregados] = useState<string[]>([]);
  return (
    <MantineProvider>
      <main style={{ maxWidth: 900, padding: 24, margin: "auto" }}>
        <h1 style={{ fontSize: 18, marginBottom: 4 }}>Buscador de insumos — preview</h1>
        <p style={{ fontSize: 13, opacity: 0.7 }}>{INSUMOS.length} insumos. No toca el servidor.</p>
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 20, marginTop: 16 }}>
          <InsumoPicker
            insumos={INSUMOS}
            existencias={EXISTENCIAS}
            superficieHa={5}
            reservado={() => 0}
            onAdd={(l) => setAgregados((p) => [...p, `${l.insumo.nombre_comercial} · ${l.cantidad_total}`])}
            onError={setMsg}
          />
        </div>
        {msg ? <p style={{ color: "crimson", fontSize: 13 }}>{msg}</p> : null}
        <button onClick={() => setModal(true)} style={{ marginTop: 16 }}>
          Abrir dentro de un modal (caso VasijasProcesoPage)
        </button>
        <AppModal opened={modal} onClose={() => setModal(false)} title="Picker dentro de modal">
          <InsumoPicker
            insumos={INSUMOS}
            existencias={EXISTENCIAS}
            superficieHa={5}
            onAdd={() => {}}
            onError={setMsg}
          />
        </AppModal>
        <ul style={{ fontSize: 13 }}>{agregados.map((a, i) => <li key={i}>{a}</li>)}</ul>
      </main>
    </MantineProvider>
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
