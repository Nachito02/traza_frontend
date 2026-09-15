import assert from "node:assert/strict";
import { test } from "vitest";
import { coincideBusqueda, normalizarTexto } from "../src/lib/texto.ts";
import {
  estadoStock,
  etiquetaInsumo,
  textoBuscableInsumo,
} from "../src/features/actividades/buscarInsumos.ts";
import type { InsumoCatalogo } from "../src/features/costos/api.ts";
import type { Existencia } from "../src/features/inventario/api.ts";

const insumo = (over: Partial<InsumoCatalogo> = {}): InsumoCatalogo => ({
  insumo_id: "i1",
  bodega_id: "b1",
  tipo: "fertilizante",
  familia: null,
  ambito: "finca",
  nombre_comercial: "Urea",
  principio_activo: "Nitrógeno (N)",
  unidad_base: "kg",
  costo_unitario: null,
  moneda: "ARS",
  ...over,
});

const existencia = (over: Partial<Existencia> = {}): Existencia => ({
  insumo_id: "i1",
  nombre_comercial: "Urea",
  tipo: "fertilizante",
  unidad_base: "kg",
  costo_unitario: null,
  stock: 10,
  stock_minimo: null,
  valorizacion: 0,
  bajo_minimo: false,
  ...over,
});

test("buscar sin tildes encuentra lo que sí las tiene", () => {
  assert.equal(normalizarTexto("Fósforo ÁCIDO"), "fosforo acido");
  const texto = textoBuscableInsumo(insumo({ nombre_comercial: "Superfosfato", principio_activo: "Fósforo (P)" }));
  assert.equal(coincideBusqueda(texto, "fosforo"), true);
  assert.equal(coincideBusqueda(texto, "FÓSFORO"), true);
});

test("matchea por principio activo, no solo por nombre comercial", () => {
  // El operario conoce el producto por el principio, no siempre por la marca.
  const texto = textoBuscableInsumo(insumo({ nombre_comercial: "Roundup", principio_activo: "Glifosato" }));
  assert.equal(coincideBusqueda(texto, "glifosato"), true);
  assert.equal(coincideBusqueda(texto, "roundup"), true);
  assert.equal(coincideBusqueda(texto, "atrazina"), false);
});

test("busca por varios términos sueltos, en cualquier orden", () => {
  const texto = textoBuscableInsumo(insumo({ nombre_comercial: "Glifosato 48 SL", principio_activo: "Glifosato" }));
  assert.equal(coincideBusqueda(texto, "glifo 48"), true);
  assert.equal(coincideBusqueda(texto, "48 glifo"), true);
  assert.equal(coincideBusqueda(texto, "glifo 62"), false);
});

test("la búsqueda vacía no filtra nada", () => {
  const texto = textoBuscableInsumo(insumo());
  assert.equal(coincideBusqueda(texto, ""), true);
  assert.equal(coincideBusqueda(texto, "   "), true);
});

test("el texto buscable incluye tipo y familia, que no se muestran en una línea", () => {
  const texto = textoBuscableInsumo(insumo({ tipo: "fitosanitario", familia: "Neonicotinoide" }));
  assert.equal(coincideBusqueda(texto, "neonicotinoide"), true);
  assert.equal(coincideBusqueda(texto, "fitosanitario"), true);
});

test("sin principio activo no mete 'null' en el texto buscable", () => {
  const texto = textoBuscableInsumo(insumo({ principio_activo: null, familia: null }));
  assert.equal(texto.includes("null"), false);
  assert.equal(coincideBusqueda(texto, "urea"), true);
});

test("distingue 'sin stock registrado' de 'sin stock'", () => {
  // La distinción que más importa: ausente del mapa NO es lo mismo que stock 0.
  assert.deepEqual(estadoStock("i1", {}), {
    clase: "sin_datos",
    texto: "sin stock registrado",
  });
  assert.deepEqual(estadoStock("i1", { i1: existencia({ stock: 0 }) }), {
    clase: "agotado",
    texto: "sin stock",
  });
  assert.deepEqual(estadoStock("i1", { i1: existencia({ stock: 12, unidad_base: "l" }) }), {
    clase: "disponible",
    texto: "disp. 12 l",
  });
});

test("la etiqueta de una línea lleva nombre y tipo", () => {
  assert.equal(etiquetaInsumo(insumo()), "Urea (fertilizante)");
});
