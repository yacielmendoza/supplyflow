# SupplyFlow · Sistema de identidad visual

Etapa 1: **definición de la identidad y del pipeline de producción de assets.**
Esta carpeta no contiene imágenes: contiene el *sistema* que hace que todas las
imágenes que generes salgan consistentes entre sí, y los prompts exactos para
producirlas con **GPT Image 2.0**.

Está estructurada siguiendo la metodología de proyecto visual del workflow
`brandkit` de Higgsfield: un **Brand Lock** único como fuente de verdad, módulos
por tipo de asset, encadenamiento explícito de referencias, y una matriz de QA
que se corre sobre el set completo (no asset por asset).

---

## Índice

| Archivo | Qué contiene | Cuándo lo usas |
|---|---|---|
| [`01-brand-lock.md`](01-brand-lock.md) | Concepto, paleta exacta, tipografía, lenguaje de forma, dispositivos gráficos, reglas de prohibición | **Siempre.** Es la fuente de verdad. Se copia literal dentro de cada prompt |
| [`02-inventario-de-assets.md`](02-inventario-de-assets.md) | Las 34 piezas que la app necesita, con formato, tamaño y destino en el código | Para saber qué falta y dónde va cada archivo |
| [`03-workflow-de-generacion.md`](03-workflow-de-generacion.md) | El orden exacto de generación y qué usa qué como referencia | **Antes de generar nada.** El orden no es opcional |
| [`04-prompts-gpt-image-2.md`](04-prompts-gpt-image-2.md) | Los prompts copy-paste, con sus parámetros y sus referencias | Al generar |
| [`05-qa-y-entrega.md`](05-qa-y-entrega.md) | Matriz de consistencia, checklist por módulo, nomenclatura, límites conocidos | Al revisar y al integrar |
| [`tokens-propuestos.css`](tokens-propuestos.css) | Los tokens `--sf-*` reescritos con la paleta nueva, listos para aplicar | Etapa 2 (aplicación en la app) |

---

## Resumen ejecutivo

**Concepto central:** *El umbral*. SupplyFlow no gestiona inventario: gestiona
**mínimos operativos**. Toda la identidad se construye sobre un solo mecanismo
visual — **una línea que cruza un nivel** — y de ahí salen el símbolo, las
ilustraciones, los estados vacíos y las insignias. Un solo movimiento expresivo,
todo lo demás callado.

**Paleta:** tomada de la UI de referencia que compartiste — lima ácido sobre
casi-negro, superficies blancas puras, neutros fríos. Ver
[`01-brand-lock.md#paleta`](01-brand-lock.md#paleta).

**Estilo de ilustración:** vector plano, 2.5 colores, trazo uniforme de extremos
redondeados, sin degradados, sin 3D, personajes a nivel de silueta. Elegido
porque es el estilo que un modelo generativo puede **sostener** a lo largo de 30
piezas sin derivar.

---

## Tres decisiones que tomé y por qué

**1. El símbolo no puede ser una llama.** La app usa hoy `Flame` como marca
(`Header.tsx:78`, `LoginScreen.tsx:101`) y *también* como icono de "urgente"
(`Dashboard.tsx:96`, `RequestsList.tsx:218`, `NotificationsView.tsx:238`). Es
una colisión semántica real: el logo dice lo mismo que el estado de alarma. Las
tres rutas de símbolo propuestas evitan la llama por completo.

**2. Los prompts van en inglés, el copy en español.** GPT Image rinde
notablemente mejor con instrucciones en inglés, pero el texto literal que debe
aparecer *dentro* de la imagen se escribe en español y se marca como literal.
Cada prompt con texto incluye una instrucción explícita de respetar tildes y ñ,
porque es el fallo más común del modelo con copy en español.

**3. La paleta nueva no está aplicada todavía.** Cambiar `--sf-accent` de
esmeralda a lima toca todas las pantallas y merece su propio PR revisado. El
bloque CSS está listo y contrastado en `tokens-propuestos.css`, pero
`src/index.css` sigue intacto. Etapa 2.

---

## Límites conocidos, por adelantado

- **GPT Image 2.0 entrega ráster, no vector.** El símbolo maestro y el lockup
  hay que vectorizarlos antes de shippearlos como `icon.svg` (Illustrator Image
  Trace, o el `image_vectorize` de Higgsfield). El PNG generado es el *boceto de
  alta fidelidad*, no el archivo final de marca.
- **El texto pequeño dentro de ilustraciones no es fiable.** Por eso el sistema
  está diseñado para que ninguna ilustración lleve texto: el copy vive en el DOM,
  encima de la imagen. Solo los assets de marketing (F1–F4) llevan texto quemado.
- **La consistencia se sostiene por referencias, no por prompts.** Un prompt
  idéntico dos veces da dos estilos distintos. El ancla de estilo (`STYLE-00`) es
  lo que hace que el set se vea como un sistema; sáltatela y todo lo demás se cae.
