import assert from "node:assert/strict";
import { test } from "node:test";
import { completedTasks, describeActivity } from "../src/pages/Public/activityPresentation.ts";

test("el historial y el contador excluyen tareas abiertas y canceladas", () => {
  assert.deepEqual(completedTasks([
    { estado: "pendiente" }, { estado: "en_progreso" },
    { estado: "completado" }, { estado: "cancelado" },
  ]), [{ estado: "completado" }]);
  assert.deepEqual(completedTasks([]), []);
});

test("presenta el progreso como datos legibles sin metadatos ni IDs", () => {
  const result = describeActivity(JSON.stringify({
    formato: "traza.v1.progreso", validation: { valid: true },
    draft: { volumen: 2.5, fecha: "2026-09-03", sistema_riego: "goteo", responsable_user_id: "uuid", revisado: false, cantidad: 0 },
    notas: "Riego realizado",
  }), [
    { name: "volumen", label: "Volumen aplicado" },
    { name: "sistema_riego", label: "Sistema de riego", options: [{ value: "goteo", label: "Goteo" }] },
  ]);
  assert.deepEqual(result.details, [
    { label: "Volumen aplicado", value: "2,5" }, { label: "Fecha", value: "3/9/2026" },
    { label: "Sistema de riego", value: "Goteo" }, { label: "Revisado", value: "No" },
    { label: "Cantidad", value: "0" }, { label: "Notas", value: "Riego realizado" },
  ]);
});

test("conserva las notas de texto, tolera JSON inválido y omite valores vacíos", () => {
  assert.equal(describeActivity("Revisar al terminar").text, "Revisar al terminar");
  assert.equal(describeActivity('{"incompleto":').text, '{"incompleto":');
  assert.deepEqual(describeActivity('{"notas":null,"items":[]}').details, []);
  assert.deepEqual(describeActivity(null), { text: null, details: [] });
});

test("muestra listas y objetos anidados sin imprimir JSON", () => {
  assert.deepEqual(describeActivity('{"productos":[{"nombre":"Abono","dosis":4}]}').details, [
    { label: "Productos 1 · Nombre", value: "Abono" },
    { label: "Productos 1 · Dosis", value: "4" },
  ]);
});
