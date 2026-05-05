import type { QuestionInput } from "./types.js";

const optionPattern = /^(\(?[A-Da-d1-9]\)?[\).:-]\s+|[-*]\s+)/;
const correctPattern = /(correcta|respuesta|answer)\s*[:=-]\s*(.+)$/i;

function cleanLine(line: string) {
  return line.replace(/\s+/g, " ").trim();
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function detectOptionLines(lines: string[]) {
  return lines
    .filter((line) => optionPattern.test(line))
    .map((line) => line.replace(optionPattern, "").replace(/^[✓✔]\s*/, "").trim())
    .filter(Boolean);
}

function detectCorrectAnswer(lines: string[], options: string[]) {
  const explicit = lines.map((line) => line.match(correctPattern)?.[2]?.trim()).find(Boolean);
  if (explicit) {
    return explicit;
  }

  const marked = lines.find((line) => /^[*✓✔]/.test(line.trim()));
  if (marked) {
    return marked.replace(/^([*✓✔]\s*)?/, "").replace(optionPattern, "").trim();
  }

  return options[0] ?? "";
}

function makeDragSuggestion(text: string, lines: string[]): QuestionInput {
  const optionLines = detectOptionLines(lines);
  const statement = lines.find((line) => /completar|complete|arrastr|blank|espacio/i.test(line)) ?? "Completar la frase:";
  const phraseLines = lines.filter((line) => !optionPattern.test(line) && line !== statement);
  const phrase = phraseLines.join(" ") || text;
  const bracketMatches = Array.from(phrase.matchAll(/\[([^\]]+)\]|\(([^\)]+)\)|_{2,}/g));
  const correctAnswers = bracketMatches
    .map((match) => match[1] ?? match[2] ?? "")
    .filter((value) => value && !/_{2,}/.test(value));

  let renderedPhrase = phrase;
  for (const answer of correctAnswers) {
    renderedPhrase = renderedPhrase.replace(`[${answer}]`, "__blank__").replace(`(${answer})`, "__blank__");
  }

  if (!renderedPhrase.includes("__blank__")) {
    renderedPhrase = `${renderedPhrase} __blank__`;
  }

  const fallbackAnswers = correctAnswers.length > 0 ? correctAnswers : optionLines.slice(0, 1);
  const draggableOptions = unique([...optionLines, ...fallbackAnswers]);

  return {
    type: "drag_and_drop",
    statement,
    textParts: renderedPhrase.split(/(__blank__)/).map(cleanLine).filter(Boolean),
    draggableOptions: draggableOptions.length > 0 ? draggableOptions : ["opcion correcta", "distractor"],
    correctAnswers: fallbackAnswers.length > 0 ? fallbackAnswers : ["opcion correcta"],
    ocrText: text
  };
}

function makeMultipleChoiceSuggestion(text: string, lines: string[]): QuestionInput {
  const options = unique(detectOptionLines(lines));
  const statementLines = lines.filter((line) => !optionPattern.test(line) && !correctPattern.test(line));
  const statement = statementLines[0] ?? lines[0] ?? "Pregunta importada";
  const correctAnswer = detectCorrectAnswer(lines, options) || options[0] || "opcion correcta";
  const safeOptions = unique([...options, correctAnswer]).filter(Boolean);

  return {
    type: "multiple_choice",
    statement,
    options: safeOptions.length >= 2 ? safeOptions : unique([correctAnswer, "opcion falsa 1", "opcion falsa 2"]),
    correctAnswer,
    ocrText: text
  };
}

function makeTableSuggestion(text: string, lines: string[]): QuestionInput {
  const options = unique([...detectOptionLines(lines), ...lines.filter((line) => line.length <= 40)]).slice(0, 12);
  const baseOptions = options.length > 0 ? options : ["By", "Vector Base", "costo de oportunidad", "valor marginal"];
  const rows = 4;
  const columns = 4;
  const cells = Array.from({ length: rows * columns }, (_, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    const option = baseOptions[index] ?? "";
    const blankAnswer = baseOptions[col] ?? baseOptions[0] ?? "";
    return {
      row,
      col,
      content: index < columns ? option : "",
      isBlank: index >= columns && index < columns + Math.min(baseOptions.length, columns),
      correctAnswer: index >= columns && index < columns + Math.min(baseOptions.length, columns) ? blankAnswer : ""
    };
  });

  return {
    type: "table_drag_and_drop",
    statement: lines[0] ?? "Completar la tabla:",
    table: {
      rows,
      columns,
      cells
    },
    draggableOptions: baseOptions,
    ocrText: text
  };
}

export function parseQuestionFromOcr(text: string): QuestionInput {
  const lines = text
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);

  const shouldBeDrag =
    /__+|completar|complete|arrastr|drag|drop|blank|espacio|cajas/i.test(text) &&
    !/^[A-Da-d][\).:-]/m.test(text);
  const shouldBeTable = /tabla|simplex|celda|cuadro|fila|columna|vector base|slack|by\b|var\.?base/i.test(text);

  if (shouldBeTable) {
    return makeTableSuggestion(text, lines);
  }

  if (shouldBeDrag) {
    return makeDragSuggestion(text, lines);
  }

  return makeMultipleChoiceSuggestion(text, lines);
}
