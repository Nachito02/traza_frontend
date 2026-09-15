import assert from "node:assert/strict";
import { test } from "vitest";
import { eligibleAssignments, taskIsActive, taskIsComplete, taskReturnPath } from "../src/pages/Tareas/taskWorkflow.ts";
import { resolveModuleAccess } from "../src/lib/permissions.ts";

const assignments = [
  { tarea_asignacion_id: "done", user_id: "one", estado: "completado" },
  { tarea_asignacion_id: "cancelled", user_id: "one", estado: "cancelado" },
  { tarea_asignacion_id: "own", user_id: "one", estado: "pendiente" },
  { tarea_asignacion_id: "other", user_id: "two", estado: "en_progreso" },
];
const mixed = { estado: "en_progreso", tarea_asignacion: assignments };

test("una asignación completada no cierra la orden que sigue activa", () => {
  assert.equal(taskIsComplete(mixed), false);
  assert.equal(taskIsActive(mixed), true);
  assert.equal(taskIsComplete({ estado: "completado" }), true);
  assert.equal(taskIsActive({ estado: "cancelado" }), false);
});

test("el encargado elige entre asignaciones activas; el operario solo completa las propias", () => {
  assert.deepEqual(eligibleAssignments(mixed, "one", true).map((a) => a.tarea_asignacion_id), ["own", "other"]);
  assert.deepEqual(eligibleAssignments(mixed, "one", false).map((a) => a.tarea_asignacion_id), ["own"]);
  assert.deepEqual(eligibleAssignments(mixed, "unknown", false), []);
  assert.deepEqual(eligibleAssignments({ estado: "pendiente" }, "one", true), []);
});

test("órdenes completadas o canceladas no ofrecen asignaciones para cerrar", () => {
  for (const estado of ["completado", "cancelado"]) {
    assert.deepEqual(eligibleAssignments({ ...mixed, estado }, "one", true), []);
  }
  assert.deepEqual(eligibleAssignments({ estado: "completado", tarea_asignacion: assignments.slice(0, 2) }, "one", true), []);
});

test("retorna a la pantalla exacta de origen y rechaza destinos desconocidos", () => {
  assert.equal(taskReturnPath("campo"), "/operacion/campo");
  assert.equal(taskReturnPath("campo-directo"), "/campo");
  assert.equal(taskReturnPath("ordenes"), "/ordenes");
  assert.equal(taskReturnPath("https://example.com"), "/ordenes");
});

test("acceder a operaciones no concede gestión de asignaciones ajenas", () => {
  const operator = resolveModuleAccess({ rol: "operario_campo" }, "bodega");
  assert.equal(operator.canRegisterTask, true);
  assert.equal(operator.canManageTasks, false);
  assert.equal(resolveModuleAccess({ rol: "productor" }, "bodega").canManageTasks, false);
  assert.equal(resolveModuleAccess({ rol: "encargado_finca" }, "bodega").canManageTasks, true);
  assert.equal(resolveModuleAccess({ rol: "admin_sistema" }, "bodega").canManageTasks, true);
  assert.equal(resolveModuleAccess(null, null).canRegisterTask, false);
});
