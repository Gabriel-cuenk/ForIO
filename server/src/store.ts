import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Question, QuestionInput } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataFile = path.resolve(__dirname, "../data/questions.json");

async function readQuestions(): Promise<Question[]> {
  try {
    const raw = await fs.readFile(dataFile, "utf-8");
    return JSON.parse(raw) as Question[];
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      await writeQuestions([]);
      return [];
    }
    throw new Error(`No se pudo leer server/data/questions.json. ${error instanceof Error ? error.message : ""}`);
  }
}

async function writeQuestions(questions: Question[]) {
  await fs.writeFile(dataFile, JSON.stringify(questions, null, 2), "utf-8");
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function validateQuestion(input: QuestionInput): string | null {
  if (!input.statement?.trim()) {
    return "El enunciado es obligatorio.";
  }

  if (input.type === "multiple_choice") {
    if (!Array.isArray(input.options) || input.options.length < 2) {
      return "Una pregunta multiple_choice necesita al menos 2 opciones.";
    }
    if (!input.correctAnswer?.trim()) {
      return "La respuesta correcta es obligatoria.";
    }
    if (!input.options.includes(input.correctAnswer)) {
      return "La respuesta correcta debe estar incluida en las opciones.";
    }
    return null;
  }

  if (input.type === "drag_and_drop") {
    const blankCount = input.textParts.filter((part) => part === "__blank__").length;
    if (blankCount === 0) {
      return "Una pregunta drag_and_drop necesita al menos un __blank__.";
    }
    if (blankCount !== input.correctAnswers.length) {
      return "La cantidad de __blank__ debe coincidir con correctAnswers.";
    }
    if (!Array.isArray(input.draggableOptions) || input.draggableOptions.length < input.correctAnswers.length) {
      return "Agregá opciones arrastrables suficientes.";
    }
    for (const answer of input.correctAnswers) {
      if (!input.draggableOptions.includes(answer)) {
        return "Cada respuesta correcta debe estar incluida en las opciones arrastrables.";
      }
    }
    return null;
  }

  if (input.type === "table_drag_and_drop") {
    if (!input.table || input.table.rows < 1 || input.table.columns < 1) {
      return "La tabla necesita al menos 1 fila y 1 columna.";
    }
    if (!Array.isArray(input.table.cells) || input.table.cells.length !== input.table.rows * input.table.columns) {
      return "La cantidad de celdas debe coincidir con filas por columnas.";
    }
    const blanks = input.table.cells.filter((cell) => cell.isBlank);
    if (blanks.length === 0) {
      return "La tabla necesita al menos una celda vacia.";
    }
    for (const cell of blanks) {
      if (!cell.correctAnswer?.trim()) {
        return "Cada celda vacia necesita una respuesta correcta.";
      }
    }
    if (!Array.isArray(input.draggableOptions) || input.draggableOptions.length < blanks.length) {
      return "Agrega opciones arrastrables suficientes para la tabla.";
    }
    for (const cell of blanks) {
      const acceptedAnswers = [cell.correctAnswer ?? "", ...(cell.acceptedAnswers ?? [])].filter(Boolean);
      if (!acceptedAnswers.some((answer) => input.draggableOptions.includes(answer))) {
        return "Cada respuesta correcta de tabla debe estar incluida en las opciones arrastrables.";
      }
    }
    return null;
  }

  return "Tipo de pregunta no soportado.";
}

export async function getQuestions() {
  return readQuestions();
}

export async function createQuestion(input: QuestionInput) {
  const validationError = validateQuestion(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const questions = await readQuestions();
  const question = { ...input, id: input.id?.trim() || makeId() } as Question;
  questions.push(question);
  await writeQuestions(questions);
  return question;
}

export async function createQuestionsBulk(inputs: QuestionInput[]) {
  const questions = await readQuestions();
  const created: Question[] = [];

  for (const input of inputs) {
    const validationError = validateQuestion(input);
    if (validationError) {
      throw new Error(validationError);
    }
    const question = { ...input, id: input.id?.trim() || makeId() } as Question;
    questions.push(question);
    created.push(question);
  }

  await writeQuestions(questions);
  return created;
}

export async function updateQuestion(id: string, input: QuestionInput) {
  const validationError = validateQuestion(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const questions = await readQuestions();
  const index = questions.findIndex((question) => question.id === id);
  if (index === -1) {
    return null;
  }

  const question = { ...input, id } as Question;
  questions[index] = question;
  await writeQuestions(questions);
  return question;
}

export async function deleteQuestion(id: string) {
  const questions = await readQuestions();
  const nextQuestions = questions.filter((question) => question.id !== id);
  if (nextQuestions.length === questions.length) {
    return false;
  }

  await writeQuestions(nextQuestions);
  return true;
}
