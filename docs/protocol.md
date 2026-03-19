# PROTOCOLO DE TRAZABILIDAD Y SUSTENTABILIDAD – NIVEL FINCA

Este documento define las **planillas operativas** del sistema.  
Cada planilla representa un tipo de registro (evento o estructura).

---

# 🔵 CAPÍTULO 0 · ORIGEN (OBLIGATORIO)

## Planilla: ORIGEN / UNIDAD PRODUCTIVA

### Tipo
Estructural (no evento)

### Frecuencia
Una vez por finca (actualizable)

### Unidad mínima
- Finca
- Cuartel

### Campos obligatorios
- Productor / Razón social
- Finca
- Localidad / Provincia
- Código de cuartel
- Superficie (ha)
- Cultivo
- Variedad

### Campos recomendados
- Sistema productivo
- Sistema de riego
- Sistema de conducción
- Coordenadas

### Regla
> Sin cuartel no se pueden cargar eventos

---

# 🟢 CAPÍTULO 1 · PROCESOS PRODUCTIVOS

## 1.1 Planilla: MANEJO DE CANOPIA

### Tipo
Evento productivo

### Unidad
Cuartel + Campaña

### Campos obligatorios
- Fecha
- Cuartel
- Tipo de práctica:
  - poda
  - desbrote
  - despampanado
  - raleo
- Intensidad
- Jornales / horas
- Responsable

### Campos opcionales
- Método (manual/mecánico)
- Observaciones

---

## 1.2 Planilla: MONITOREO FENOLÓGICO

### Tipo
Evento de monitoreo

### Campos obligatorios
- Fecha
- Cuartel
- Estado fenológico:
  - brotación
  - floración
  - envero
  - maduración
- Responsable

### Campos opcionales
- % avance
- °Brix
- Observaciones

---

## 1.3 Planilla: COSECHA ⚠️ CRÍTICO

### Tipo
Evento generador

### Resultado
👉 Crea el LOTE DE COSECHA

### Campos obligatorios
- Fecha de cosecha
- Cuartel
- Cantidad
- Unidad (kg / bins / cajas)
- Destino
- Responsable

### Regla
> Este evento crea un ID_LOTE único

---

# 💧 CAPÍTULO 2 · AGUA

## 2.1 Planilla: RIEGO

### Tipo
Evento ambiental

### Campos obligatorios
- Fecha
- Cuartel
- Volumen
- Unidad (m³ / mm)
- Tiempo (horas)
- Sistema de riego
- Responsable

### Opcionales
- Hora inicio
- Fuente de agua
- Observaciones

---

## 2.2 Planilla: PRECIPITACIONES

### Tipo
Evento ambiental (natural)

### Unidad
Finca

### Campos obligatorios
- Fecha
- Milímetros

### Opcionales
- Origen del dato
- Observaciones

---

# 🌱 CAPÍTULO 3 · SUELO

## 3.1 Planilla: LABORES DE SUELO

- Fecha
- Cuartel
- Tipo de labor
- Intensidad
- Jornales
- Responsable

---

## 3.2 Planilla: FERTILIZACIÓN

- Fecha
- Cuartel
- Producto
- Dosis
- Unidad
- Método
- Responsable

---

## 3.3 Planilla: ANÁLISIS DE SUELO

- Fecha
- Unidad muestreada
- Laboratorio
- Parámetros

---

## 3.4 Planilla: ENMIENDAS

- Fecha
- Tipo
- Dosis
- Unidad
- Responsable

---

## 3.5 Planilla: COBERTURA / EROSIÓN

- Fecha
- Tipo de cobertura
- Manejo
- Responsable

---

# 🐛 CAPÍTULO 4 · MIP

## 4.1 MONITOREO DE ENFERMEDADES

- Fecha
- Cuartel
- Enfermedad
- Incidencia
- Responsable

---

## 4.2 MONITOREO DE PLAGAS

- Fecha
- Cuartel
- Plaga
- Nivel
- Responsable

---

## 4.3 APLICACIÓN DE FITOSANITARIOS ⚠️ CRÍTICO

### Campos obligatorios
- Fecha
- Cuartel
- Producto
- Dosis
- Unidad
- Carencia (días)
- Motivo
- Responsable

### Opcionales
- Principio activo
- Condiciones climáticas
- Equipo

---

## 4.4 SOBRANTES / LAVADO

- Fecha
- Tipo
- Volumen
- Disposición
- Responsable

---

# 🧪 CAPÍTULO 5 · INOCUIDAD

## 5.1 LIMPIEZA DE COSECHA ⚠️

- Fecha
- Tipo de elemento
- Método
- Responsable

---

## 5.2 SANITIZACIÓN BAÑOS

- Fecha
- Tipo de baño
- Checklist
- Responsable

---

## 5.3 NO CONFORMIDADES

- Fecha
- Descripción
- Acción
- Responsable

---

## 5.4 RECLAMOS

- Fecha
- Origen
- Descripción
- Responsable

---

## 5.5 INVENTARIO DE INSUMOS

### Tipo
Estado (no evento)

- Producto
- Cantidad
- Fecha vencimiento
- Estado

---

## 5.6 RESIDUOS

- Fecha
- Tipo
- Cantidad
- Destino
- Responsable

---

# ⚡ CAPÍTULO 6 · ENERGÍA

## 6.1 ENERGÍA PARA RIEGO

- Período
- Cuartel
- Tipo energía
- Consumo
- Responsable

---

## 6.2 ENERGÍA HELADAS

- Fecha
- Cuartel
- Tipo energía
- Consumo
- Responsable

---

# 👷 CAPÍTULO 7 · PERSONAL

## 7.1 CAPACITACIONES

- Fecha
- Tema
- Participantes
- Responsable

---

## 7.2 ENTREGA DE EPP

- Fecha
- Persona
- Elemento
- Responsable

---

## 7.3 ACCIDENTES

- Fecha
- Persona
- Tipo
- Acción
- Responsable

---

# 🔧 CAPÍTULO 8 · MANTENIMIENTO

## 8.1 MANTENIMIENTO DE EQUIPOS

- Fecha
- Equipo
- Tipo
- Responsable

---

# 🚨 REGLAS CLAVE DEL PROTOCOLO

- No hay eventos sin cuartel
- No hay cosecha sin lote
- No hay cosecha con carencia activa
- No se usan insumos vencidos
- El lote hereda todos los eventos

---

# 📦 RESULTADO FINAL

Cada lote contiene:

- ORIGEN (cuartel)
- HISTORIAL PRODUCTIVO
- HISTORIAL AMBIENTAL
- HISTORIAL SANITARIO
- HISTORIAL SOCIAL

👉 Trazabilidad completa del producto