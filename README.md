# Quiz Practica Simplex

Proyecto fullstack rapido para estudiar con preguntas tipo Quizizz. Incluye practica de multiple choice, preguntas con drag and drop, panel admin sin login y persistencia simple en JSON local.

## Stack

- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- Drag and Drop: `@dnd-kit/core`
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

## API

```http
GET /api/questions
POST /api/questions
PUT /api/questions/:id
DELETE /api/questions/:id
```

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

## Datos de ejemplo

El archivo `server/data/questions.json` ya trae 3 preguntas de Programacion Lineal / Simplex:

- 1 multiple choice
- 2 drag and drop

Podés editar ese JSON a mano o usar `/admin`.
