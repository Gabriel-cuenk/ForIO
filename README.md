# Quiz Practica Simplex

Proyecto fullstack rapido para estudiar con preguntas tipo Quizizz. Incluye practica de multiple choice, preguntas con drag and drop, panel admin sin login y persistencia simple en JSON local.

## Stack

- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- Drag and Drop: `@dnd-kit/core`
- OCR local: `tesseract.js`
- Persistencia: `server/data/questions.json`

## Requisitos

- Node.js 20 o superior
- npm

## Instalacion

Desde la raiz del proyecto:

```bash
npm install
```

## Correr en desarrollo

```bash
npm run dev
```

Esto levanta:

- Frontend: http://localhost:5173
- Backend: http://localhost:4000

Vite proxya `/api` hacia el backend, asi que desde el frontend alcanza con pedir `/api/questions`.

## Scripts utiles

```bash
npm run dev
npm run build
npm run start
```

Tambien se pueden correr por separado:

```bash
npm run dev --workspace server
npm run dev --workspace client
```

## Pantallas

- `/`: modo practica.
- `/admin`: panel para crear, editar y eliminar preguntas.
- `/admin/import`: importar capturas con OCR y revisar antes de guardar.

## API

```http
GET /api/questions
POST /api/questions
PUT /api/questions/:id
DELETE /api/questions/:id
POST /api/questions/bulk
POST /api/ocr/upload
POST /api/ocr/parse-question
```

## Importar capturas con OCR

Entra a `/admin/import`, subi una o varias imagenes y el backend va a:

1. Leer el texto con `tesseract.js`.
2. Mostrar el texto OCR original.
3. Proponer una pregunta editable.
4. Permitir corregir tipo, enunciado, opciones, respuesta correcta, blanks y tablas.
5. Guardar una o varias preguntas con `POST /api/questions/bulk`.

El texto OCR original se guarda en cada pregunta como `ocrText` para revisar errores despues.

Si el OCR detecta palabras como `tabla`, `simplex`, `fila`, `columna`, `Vector Base`, `By` o `slack`, intenta proponer una pregunta `table_drag_and_drop`. La deteccion de coordenadas no es perfecta: la pantalla de revision permite reconstruir la tabla manualmente rapido.

### Cambiar proveedor OCR

La abstraccion esta en `server/src/ocrProvider.ts`. Por defecto usa `tesseract.js`, sin servicios externos.

Para preparar un proveedor externo:

```bash
OCR_PROVIDER=external
OCR_API_KEY=tu_api_key
```

El esqueleto `ExternalOcrProvider` ya esta separado para conectar una API mas precisa cuando quieras.

## Formato de preguntas

### Multiple choice

```json
{
  "id": "1",
  "type": "multiple_choice",
  "statement": "El costo de oportunidad se visualiza en...",
  "options": [
    "la línea del cálculo de la condición de optimalidad",
    "la función objetivo",
    "las restricciones",
    "el recurso"
  ],
  "correctAnswer": "la línea del cálculo de la condición de optimalidad"
}
```

### Drag and drop

```json
{
  "id": "2",
  "type": "drag_and_drop",
  "statement": "Completar la frase:",
  "textParts": [
    "El",
    "__blank__",
    "se visualiza en la línea del cálculo de la condición de optimalidad y me permite decidir cuánto",
    "__blank__",
    "el coeficiente en la",
    "__blank__"
  ],
  "draggableOptions": [
    "costo de oportunidad",
    "aumentar",
    "función objetivo",
    "valor marginal",
    "recurso",
    "disminuir"
  ],
  "correctAnswers": [
    "costo de oportunidad",
    "aumentar",
    "función objetivo"
  ]
}
```

En el admin, para crear una frase drag and drop, separa las partes con `|` y escribi `__blank__` donde quieras un espacio:

```text
El | __blank__ | se visualiza en la linea de optimalidad y permite | __blank__ | el coeficiente en la | __blank__
```

La cantidad de `__blank__` tiene que coincidir con la cantidad de respuestas correctas.

### Tabla con drag and drop

```json
{
  "id": "4",
  "type": "table_drag_and_drop",
  "statement": "La tabla óptima del simplex dual de un problema primal de maximización se arma con:",
  "table": {
    "rows": 5,
    "columns": 6,
    "cells": [
      {
        "row": 0,
        "col": 0,
        "content": "",
        "isBlank": true,
        "correctAnswer": "By"
      },
      {
        "row": 0,
        "col": 1,
        "content": "",
        "isBlank": true,
        "correctAnswer": "Coeficientes de Var.Base"
      }
    ]
  },
  "draggableOptions": ["By", "Vector Base", "costo de oportunidad", "valor marginal"]
}
```

En `/admin` se puede crear manualmente una tabla indicando filas, columnas, contenido fijo, celdas vacias y respuesta correcta para cada celda. En modo practica, cada celda vacia se valida contra su `correctAnswer` y se marca visualmente como correcta o incorrecta.

## Datos de ejemplo

El archivo `server/data/questions.json` ya trae preguntas de Programacion Lineal / Simplex:

- 1 multiple choice
- 2 drag and drop
- 1 tabla con drag and drop

Podés editar ese JSON a mano o usar `/admin`.
