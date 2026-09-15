import assert from "node:assert/strict";
import { test } from "vitest";
import { CUSTOM_OPTION, customValueError, resolveCustomDraftValue, serializeCustomFields } from "../src/lib/customOptions.ts";
import { EVENTO_CONFIG } from "../src/pages/Trazabilidad/eventoConfig.ts";

test("valida opción conocida, personalizada, vacía y límite de longitud", () => {
  const options = [{ value: "goteo", label: "Goteo" }];
  assert.equal(customValueError("goteo", options), undefined);
  assert.equal(customValueError("Riego por mangas", options), undefined);
  assert.equal(customValueError("", options), undefined);
  for (const value of [CUSTOM_OPTION, "otro", "   ", "x".repeat(201)]) assert.ok(customValueError(value, options));
  assert.ok(customValueError("", options, true));
  assert.equal(customValueError("x".repeat(200), options), undefined);
});

test("cada grupo descriptivo guarda y restaura texto real sin alterar campos cerrados", () => {
  let count = 0;
  for (const config of Object.values(EVENTO_CONFIG)) {
    for (const field of config.fields.filter((item) => item.allowOther)) {
      count++;
      const draft = { [field.name]: "  Práctica específica  ", unidad: "kg", responsable_user_id: "user-1" };
      const saved = serializeCustomFields(draft, [field]);
      assert.equal(saved[field.name], "Práctica específica");
      assert.equal(resolveCustomDraftValue(field, saved), "Práctica específica");
      assert.equal(saved.unidad, "kg");
      assert.equal(saved.responsable_user_id, "user-1");
      assert.throws(() => serializeCustomFields({ [field.name]: CUSTOM_OPTION }, [field]));
      const known = field.options?.find((option) => option.value !== "otro");
      if (known) assert.equal(serializeCustomFields({ [field.name]: known.value }, [field])[field.name], known.value);
    }
    for (const field of config.fields.filter((item) => ["unidad", "estado", "destino", "responsable_user_id"].includes(item.name))) assert.ok(!field.allowOther);
  }
  assert.equal(count, 14);
});

test("recupera campos auxiliares históricos y elimina el auxiliar al elegir una opción conocida", () => {
  for (const [event, key, legacy, known] of [
    ["labor_suelo", "tipo_labor", "otro_labor", "rastrear"],
    ["canopia", "tipo_practica", "otro_practica", "poda"],
    ["riego", "sistema_riego", "sistema_riego_otro", "goteo"],
  ]) {
    const fields = EVENTO_CONFIG[event].fields;
    const field = fields.find((item) => item.name === key)!;
    const draft = { [key]: "otro", [legacy]: "Método histórico", observaciones: "Nota independiente" };
    assert.equal(resolveCustomDraftValue(field, draft), "Método histórico");
    const saved = serializeCustomFields(draft, fields);
    assert.equal(saved[key], "Método histórico");
    assert.equal(saved.observaciones, "Nota independiente");
    assert.equal(saved[legacy], undefined);
    assert.equal(draft[legacy], "Método histórico");
    assert.equal(serializeCustomFields({ ...draft, [key]: known }, fields)[key], known);
  }
});

test("lee observaciones heredadas pero no reutiliza notas para un Otro recién seleccionado", () => {
  const field = EVENTO_CONFIG.enmienda.fields.find((item) => item.name === "tipo")!;
  assert.equal(resolveCustomDraftValue(field, { tipo: "otro", observaciones: "Guano de oveja" }), "Guano de oveja");
  assert.throws(() => serializeCustomFields({ tipo: CUSTOM_OPTION, observaciones: "Nota" }, [field]));
});
