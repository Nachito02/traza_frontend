# Design System Foundation

Esta base toma como referencia la estetica actual de Traza:

- fondo vino oscuro
- superficies vino profundo
- acentos dorado arena
- paneles crema suave
- tipografia calida con contraste editorial

## Principios

1. Usar tokens semanticos, no hex en componentes nuevos.
2. Separar estructura de marca:
   - estructura = spacing, radios, sombras, densidad
   - marca = paleta, contraste, tipografia
3. Mantener compatibilidad con clases existentes mientras migramos.
4. Construir wrappers propios antes de tocar pantallas masivas.

## Tokens principales

- `--app-bg`: fondo de la aplicacion
- `--surface-base`: superficie principal
- `--surface-muted`: panel claro
- `--text-primary`: texto sobre fondo oscuro
- `--text-secondary`: texto de apoyo
- `--text-ink`: texto sobre superficie clara
- `--accent-primary`: vino interactivo
- `--accent-secondary`: dorado
- `--border-default`: borde comun
- `--feedback-success|warning|danger`

## Patrones visuales actuales consolidados

- `Page shell`: `bg-secondary` + `px-6 py-10`
- `Section card`: `rounded-2xl bg-primary p-5/6 shadow-lg`
- `Action button`: borde dorado + fondo claro o vino segun variante
- `Field`: fondo blanco, borde dorado suave, radio grande

## Componentes base a extraer en la siguiente etapa

- `AppButton`
- `AppCard`
- `AppInput`
- `AppSelect`
- `AppTextarea`
- `AppModal`
- `PageHeader`
- `StatusBadge`

## Reglas de migracion

1. No agregar nuevos hex inline.
2. Reutilizar tokens de `src/theme/tokens.ts`.
3. Si un patron aparece en 3 pantallas, se vuelve componente base.
4. Mantener las alias antiguas (`bg-primary`, `text-text`, etc.) hasta terminar la migracion.
