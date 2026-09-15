import assert from "node:assert/strict";
import { test } from "vitest";
import {
  camposObligatoriosFaltantes,
  camposRenderizados,
  clampNumerico,
  resumirFaltantes,
} from "../src/features/actividades/eventoValidation.ts";
import { EVENTO_CONFIG } from "../src/pages/Trazabilidad/eventoConfig.ts";

test("exige los campos obligatorios visibles y deja pasar cuando están completos", () => {
  const fertilizacion = EVENTO_CONFIG.fertilizacion;

  const vacio = camposObligatoriosFaltantes(fertilizacion, {});
  assert.deepEqual(
    vacio.map((c) => c.name).sort(),
    ["fecha", "metodo"],
  );

  const completo = camposObligatoriosFaltantes(fertilizacion, {
    fecha: "2026-09-14",
    metodo: "foliar",
  });
  assert.deepEqual(completo, []);
});

test("no exige campos que EventoFields nunca renderiza", () => {
  // El catálogo marca 10 campos required que no se pintan: los user_select (el responsable
  // sale del paso de ejecución) y los 'otro' legacy. Exigirlos trabaría el form sin salida.
  for (const [tipo, config] of Object.entries(EVENTO_CONFIG)) {
    const faltantes = camposObligatoriosFaltantes(config, {});
    for (const campo of faltantes) {
      const field = config.fields.find((f) => f.name === campo.name);
      assert.notEqual(field?.type, "user_select", `${tipo}.${campo.name} es user_select y no se renderiza`);
    }
  }
});

test("elegir 'Otro' sin escribir el detalle no deja avanzar", () => {
  // En labor_suelo el detalle del "Otro" no es un campo aparte: se valida sobre el select
  // padre (tipo_labor, allowOther), que es donde AppSelectWithOther guarda el texto libre.
  const laborSuelo = EVENTO_CONFIG.labor_suelo;
  const base = { fecha: "2026-09-14" };

  const sinDetalle = camposObligatoriosFaltantes(laborSuelo, { ...base, tipo_labor: "otro" });
  assert.equal(sinDetalle.some((c) => c.name === "tipo_labor"), true);

  const conDetalle = camposObligatoriosFaltantes(laborSuelo, { ...base, tipo_labor: "descompactar" });
  assert.equal(conDetalle.some((c) => c.name === "tipo_labor"), false);

  const opcionDelCatalogo = camposObligatoriosFaltantes(laborSuelo, { ...base, tipo_labor: "subsolar" });
  assert.equal(opcionDelCatalogo.some((c) => c.name === "tipo_labor"), false);
});

test("los campos 'otro' legacy no se exigen por separado: los cubre su select padre", () => {
  // labor_suelo.otro_labor y canopia.otro_practica están marcados required en el catálogo,
  // pero no se renderizan. Pedirlos dejaría esos dos eventos imposibles de completar.
  for (const [tipo, campo] of [["labor_suelo", "otro_labor"], ["canopia", "otro_practica"]] as const) {
    const faltantes = camposObligatoriosFaltantes(EVENTO_CONFIG[tipo], {});
    assert.equal(faltantes.some((c) => c.name === campo), false, `${tipo}.${campo} no debería exigirse`);
  }
});

test("camposRenderizados descarta user_select y respeta showWhen", () => {
  for (const config of Object.values(EVENTO_CONFIG)) {
    const visibles = camposRenderizados(config, {});
    assert.equal(visibles.some((f) => f.type === "user_select"), false);
    assert.equal(visibles.some((f) => f.showWhen), false);
  }
});

test("el resumen nombra pocos campos y cuenta el resto", () => {
  const faltantes = [
    { name: "a", label: "Fecha", motivo: "" },
    { name: "b", label: "Método", motivo: "" },
    { name: "c", label: "Dosis", motivo: "" },
  ];
  assert.equal(resumirFaltantes(faltantes), "fecha, método y 1 más");
  assert.equal(resumirFaltantes(faltantes.slice(0, 1)), "fecha");
  assert.equal(resumirFaltantes([]), "");
});

test("recorta el porcentaje de avance al rango 0–100", () => {
  const pct = EVENTO_CONFIG.fenologia.fields.find((f) => f.name === "porcentaje_avance")!;
  assert.equal(pct.min, "0");
  assert.equal(pct.max, "100");

  assert.equal(clampNumerico(pct, "250"), "100");
  assert.equal(clampNumerico(pct, "-5"), "0");
  assert.equal(clampNumerico(pct, "100"), "100");
  assert.equal(clampNumerico(pct, "0"), "0");
  assert.equal(clampNumerico(pct, "37.5"), "37.5");
  // Vacío se conserva: el campo es opcional y borrarlo tiene que seguir siendo posible.
  assert.equal(clampNumerico(pct, ""), "");
});

test("el recorte no toca campos sin límites, ni de otro tipo", () => {
  const brix = EVENTO_CONFIG.fenologia.fields.find((f) => f.name === "brix")!;
  assert.equal(clampNumerico(brix, "999"), "999");

  const fecha = EVENTO_CONFIG.fenologia.fields.find((f) => f.name === "fecha")!;
  assert.equal(clampNumerico(fecha, "2026-09-14"), "2026-09-14");

  // Solo mínimo declarado: recorta abajo y deja pasar cualquier valor alto.
  const volumen = EVENTO_CONFIG.riego.fields.find((f) => f.name === "volumen")!;
  assert.equal(clampNumerico(volumen, "-3"), "0");
  assert.equal(clampNumerico(volumen, "99999"), "99999");
});
