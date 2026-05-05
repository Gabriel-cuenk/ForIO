import { useEffect, useMemo, useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  ClipboardList,
  FileImage,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  Wand2,
  XCircle
} from "lucide-react";
import {
  createQuestion,
  createQuestionsBulk,
  deleteQuestion,
  getQuestions,
  parseQuestionFromText,
  updateQuestion,
  uploadOcrImages
} from "./api";
import type { OcrUploadResult } from "./api";
import DragDropAnswer from "./components/DragDropAnswer";
import TableDragDropAnswer, { cellKey } from "./components/TableDragDropAnswer";
import type {
  DragAndDropQuestion,
  DragTable,
  MultipleChoiceQuestion,
  Question,
  QuestionInput,
  QuestionType,
  TableDragAndDropQuestion
} from "./types/questions";

const emptyMc: Omit<MultipleChoiceQuestion, "id"> = {
  type: "multiple_choice",
  statement: "",
  options: ["", ""],
  correctAnswer: ""
};

const emptyDnd: Omit<DragAndDropQuestion, "id"> = {
  type: "drag_and_drop",
  statement: "",
  textParts: ["", "__blank__", ""],
  draggableOptions: ["", "", ""],
  correctAnswers: [""]
};

const emptyTable: Omit<TableDragAndDropQuestion, "id"> = {
  type: "table_drag_and_drop",
  statement: "",
  table: makeEmptyTable(3, 3),
  draggableOptions: ["", "", ""]
};

function cleanList(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}

function makeEmptyTable(rows: number, columns: number): DragTable {
  return {
    rows,
    columns,
    cells: Array.from({ length: rows * columns }, (_, index) => ({
      row: Math.floor(index / columns),
      col: index % columns,
      content: "",
      isBlank: false,
      correctAnswer: ""
    }))
  };
}

function tableBlankCells(table: DragTable) {
  return table.cells.filter((cell) => cell.isBlank);
}

function normalizeQuestionInput(question: QuestionInput): QuestionInput {
  if (question.type !== "table_drag_and_drop") {
    return question;
  }

  return {
    ...question,
    draggableOptions: cleanList([
      ...question.draggableOptions,
      ...tableBlankCells(question.table).map((cell) => cell.correctAnswer ?? "")
    ])
  };
}

type ImportDraft = OcrUploadResult & {
  id: string;
};

export default function App() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [path, setPath] = useState(window.location.pathname);

  async function loadQuestions() {
    setLoading(true);
    setError("");
    try {
      setQuestions(await getQuestions());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las preguntas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQuestions();
  }, []);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function navigate(nextPath: string) {
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => navigate("/")}>
          <ClipboardList size={22} />
          Quiz Simplex
        </button>
        <nav>
          <button className={path === "/" ? "active" : ""} type="button" onClick={() => navigate("/")}>
            Practica
          </button>
          <button className={path === "/admin" ? "active" : ""} type="button" onClick={() => navigate("/admin")}>
            Admin
          </button>
          <button className={path === "/admin/import" ? "active" : ""} type="button" onClick={() => navigate("/admin/import")}>
            Importar
          </button>
        </nav>
      </header>

      {loading ? <main className="main">Cargando preguntas...</main> : null}
      {error ? <main className="main error-box">{error}</main> : null}
      {!loading && !error && path === "/admin/import" ? (
        <ImportPage onSaved={loadQuestions} />
      ) : null}
      {!loading && !error && path === "/admin" ? (
        <AdminPage questions={questions} onChange={loadQuestions} />
      ) : null}
      {!loading && !error && path !== "/admin" && path !== "/admin/import" ? <PracticePage questions={questions} /> : null}
    </div>
  );
}

function PracticePage({ questions }: { questions: Question[] }) {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState("");
  const [dndAnswers, setDndAnswers] = useState<string[]>([]);
  const [tableAnswers, setTableAnswers] = useState<Record<string, string>>({});
  const [tableResults, setTableResults] = useState<Record<string, boolean>>({});
  const [checked, setChecked] = useState<null | boolean>(null);
  const question = questions[index];
  const isFinished = index >= questions.length;

  function resetAnswer() {
    setSelected("");
    setDndAnswers([]);
    setTableAnswers({});
    setTableResults({});
    setChecked(null);
  }

  function restart() {
    setIndex(0);
    setScore(0);
    resetAnswer();
  }

  function validate() {
    if (!question) {
      return;
    }

    let isCorrect = false;
    if (question.type === "multiple_choice") {
      isCorrect = selected === question.correctAnswer;
    }
    if (question.type === "drag_and_drop") {
      isCorrect = question.correctAnswers.every((answer, answerIndex) => dndAnswers[answerIndex] === answer);
    }
    if (question.type === "table_drag_and_drop") {
      const results = Object.fromEntries(
        tableBlankCells(question.table).map((cell) => {
          const key = cellKey(cell.row, cell.col);
          return [key, tableAnswers[key] === cell.correctAnswer];
        })
      );
      setTableResults(results);
      isCorrect = Object.values(results).every(Boolean);
    }

    setChecked(isCorrect);
    if (isCorrect) {
      setScore((current) => current + 1);
    }
  }

  function next() {
    setIndex((current) => current + 1);
    resetAnswer();
  }

  if (questions.length === 0) {
    return (
      <main className="main empty-state">
        <h1>No hay preguntas cargadas</h1>
        <p>Entrá al admin para crear la primera.</p>
      </main>
    );
  }

  if (isFinished) {
    return (
      <main className="main result-panel">
        <h1>Resumen final</h1>
        <p className="score-big">
          {score}/{questions.length}
        </p>
        <p>Respondiste correctamente el {Math.round((score / questions.length) * 100)}%.</p>
        <button className="primary-button" type="button" onClick={restart}>
          <RotateCcw size={18} />
          Reiniciar quiz
        </button>
      </main>
    );
  }

  const canValidate =
    question.type === "multiple_choice"
      ? Boolean(selected)
      : question.type === "drag_and_drop"
        ? dndAnswers.filter(Boolean).length === question.correctAnswers.length
        : tableBlankCells(question.table).every((cell) => Boolean(tableAnswers[cellKey(cell.row, cell.col)]));

  return (
    <main className="main">
      <section className="quiz-card">
        <div className="quiz-meta">
          <span>
            Pregunta {index + 1} de {questions.length}
          </span>
          <strong>Puntaje: {score}</strong>
        </div>

        <h1>{question.statement}</h1>

        {question.type === "multiple_choice" ? (
          <div className="choices">
            {question.options.map((option) => (
              <button
                className={`choice ${selected === option ? "selected" : ""}`}
                disabled={checked !== null}
                key={option}
                type="button"
                onClick={() => setSelected(option)}
              >
                {option}
              </button>
            ))}
          </div>
        ) : question.type === "drag_and_drop" ? (
          <DragDropAnswer
            key={question.id}
            textParts={question.textParts}
            options={question.draggableOptions}
            disabled={checked !== null}
            onChange={setDndAnswers}
          />
        ) : (
          <TableDragDropAnswer
            key={question.id}
            table={question.table}
            options={question.draggableOptions}
            disabled={checked !== null}
            results={checked !== null ? tableResults : undefined}
            onChange={setTableAnswers}
          />
        )}

        {checked !== null ? <Feedback question={question} isCorrect={checked} /> : null}

        <div className="actions-row">
          {checked === null ? (
            <button className="primary-button" type="button" disabled={!canValidate} onClick={validate}>
              <CheckCircle2 size={18} />
              Validar
            </button>
          ) : (
            <button className="primary-button" type="button" onClick={next}>
              Siguiente
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

function Feedback({ question, isCorrect }: { question: Question; isCorrect: boolean }) {
  const correctText =
    question.type === "multiple_choice"
      ? question.correctAnswer
      : question.type === "drag_and_drop"
        ? question.correctAnswers.join(" / ")
        : tableBlankCells(question.table)
            .map((cell) => `(${cell.row + 1},${cell.col + 1}) ${cell.correctAnswer}`)
            .join(" / ");
  return (
    <div className={`feedback ${isCorrect ? "correct" : "incorrect"}`}>
      {isCorrect ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
      <div>
        <strong>{isCorrect ? "Correcto" : "Incorrecto"}</strong>
        <span>Respuesta correcta: {correctText}</span>
      </div>
    </div>
  );
}

function ImportPage({ onSaved }: { onSaved: () => Promise<void> }) {
  const [drafts, setDrafts] = useState<ImportDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    setBusy(true);
    setMessage("Procesando OCR...");
    try {
      const response = await uploadOcrImages(Array.from(files));
      setDrafts(
        response.results.map((result) => ({
          ...result,
          id: `${result.filename}-${Date.now()}-${Math.random().toString(16).slice(2)}`
        }))
      );
      setMessage("OCR listo. Revisa y corregi antes de guardar.");
    } catch (uploadError) {
      setMessage(uploadError instanceof Error ? uploadError.message : "No se pudo procesar OCR.");
    } finally {
      setBusy(false);
    }
  }

  async function reparse(index: number) {
    const draft = drafts[index];
    setBusy(true);
    setMessage("Interpretando texto OCR...");
    try {
      const parsedQuestion = await parseQuestionFromText(draft.text);
      updateDraft(index, { ...draft, parsedQuestion });
      setMessage("Sugerencia actualizada.");
    } catch (parseError) {
      setMessage(parseError instanceof Error ? parseError.message : "No se pudo interpretar el texto.");
    } finally {
      setBusy(false);
    }
  }

  function updateDraft(index: number, nextDraft: ImportDraft) {
    setDrafts((current) => current.map((draft, draftIndex) => (draftIndex === index ? nextDraft : draft)));
  }

  function updateParsed(index: number, parsedQuestion: QuestionInput) {
    const draft = drafts[index];
    updateDraft(index, { ...draft, parsedQuestion: { ...parsedQuestion, ocrText: draft.text } });
  }

  async function saveAll() {
    setBusy(true);
    setMessage("");
    try {
      await createQuestionsBulk(drafts.map((draft) => normalizeQuestionInput({ ...draft.parsedQuestion, ocrText: draft.text })));
      await onSaved();
      setDrafts([]);
      setMessage("Preguntas importadas al banco.");
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "No se pudieron guardar las preguntas.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="main import-layout">
      <section className="editor-panel import-drop">
        <div className="section-title">
          <h1>Importar desde capturas</h1>
          <FileImage size={28} />
        </div>
        <label className="file-picker">
          <Upload size={24} />
          <span>Subir una o varias imagenes</span>
          <input accept="image/*" multiple type="file" onChange={(event) => uploadFiles(event.target.files)} />
        </label>
        <p className="helper-text">El OCR no intenta ser perfecto: lee la imagen, propone una pregunta y deja todo editable.</p>
        {message ? <p className="form-message">{message}</p> : null}
      </section>

      <section className="import-review">
        {drafts.map((draft, index) => (
          <ImportDraftEditor
            draft={draft}
            disabled={busy}
            index={index}
            key={draft.id}
            onChange={(parsedQuestion) => updateParsed(index, parsedQuestion)}
            onDraftTextChange={(text) => updateDraft(index, { ...draft, text })}
            onRemove={() => setDrafts((current) => current.filter((_, draftIndex) => draftIndex !== index))}
            onReparse={() => reparse(index)}
          />
        ))}
      </section>

      {drafts.length > 0 ? (
        <div className="sticky-save">
          <span>{drafts.length} pregunta(s) listas para revisar</span>
          <button className="primary-button" disabled={busy} type="button" onClick={saveAll}>
            <Save size={18} />
            Guardar importacion
          </button>
        </div>
      ) : null}
    </main>
  );
}

function ImportDraftEditor({
  draft,
  disabled,
  index,
  onChange,
  onDraftTextChange,
  onRemove,
  onReparse
}: {
  draft: ImportDraft;
  disabled: boolean;
  index: number;
  onChange: (question: QuestionInput) => void;
  onDraftTextChange: (text: string) => void;
  onRemove: () => void;
  onReparse: () => void;
}) {
  const question = draft.parsedQuestion;
  const textPartsRaw = question.type === "drag_and_drop" ? question.textParts.join(" | ") : "";
  const blankCount =
    question.type === "drag_and_drop" ? question.textParts.filter((part) => part === "__blank__").length : 0;

  function setType(nextType: QuestionType) {
    if (nextType === question.type) {
      return;
    }

    if (nextType === "multiple_choice") {
      onChange({
        type: "multiple_choice",
        statement: question.statement,
        options: question.type === "multiple_choice" ? question.options : question.draggableOptions,
        correctAnswer:
          question.type === "multiple_choice"
            ? question.correctAnswer
            : question.type === "drag_and_drop"
              ? question.correctAnswers[0] ?? ""
              : tableBlankCells(question.table)[0]?.correctAnswer ?? "",
        ocrText: draft.text
      });
      return;
    }

    if (nextType === "table_drag_and_drop") {
      const sourceOptions = question.type === "multiple_choice" ? question.options : question.draggableOptions;
      onChange({
        type: "table_drag_and_drop",
        statement: question.statement,
        table: makeEmptyTable(4, 4),
        draggableOptions: sourceOptions.length > 0 ? sourceOptions : ["By", "Vector Base", "costo de oportunidad", "valor marginal"],
        ocrText: draft.text
      });
      return;
    }

    const answer =
      question.type === "multiple_choice"
        ? question.correctAnswer
        : question.type === "drag_and_drop"
          ? question.correctAnswers[0] ?? ""
          : tableBlankCells(question.table)[0]?.correctAnswer ?? "";
    onChange({
      type: "drag_and_drop",
      statement: question.statement,
      textParts: [question.statement, "__blank__"],
      draggableOptions: question.type === "multiple_choice" ? question.options : question.draggableOptions,
      correctAnswers: [answer],
      ocrText: draft.text
    });
  }

  function markBlank(word: string) {
    if (question.type !== "drag_and_drop" || !word.trim()) {
      return;
    }

    const phrase = question.textParts.join(" ");
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const nextPhrase = phrase.replace(new RegExp(`\\b${escaped}\\b`, "i"), "__blank__");
    onChange({
      ...question,
      textParts: nextPhrase.split(/(__blank__)/).map((part) => part.trim()).filter(Boolean),
      draggableOptions: cleanList([...question.draggableOptions, word]),
      correctAnswers: cleanList([...question.correctAnswers, word]),
      ocrText: draft.text
    });
  }

  const words = uniqueWords(draft.text).slice(0, 28);

  return (
    <article className="editor-panel import-card">
      <div className="section-title">
        <h1>Captura {index + 1}</h1>
        <div className="item-actions">
          <button className="ghost-button" disabled={disabled} type="button" onClick={onReparse}>
            <Wand2 size={17} />
            Reinterpretar
          </button>
          <button className="icon-button danger" disabled={disabled} type="button" onClick={onRemove} aria-label="Quitar">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <label>
        Texto OCR original
        <textarea value={draft.text} onChange={(event) => onDraftTextChange(event.target.value)} />
        <small>Archivo: {draft.filename}. Proveedor: {draft.provider}</small>
      </label>

      <div className="segmented">
        <button className={question.type === "multiple_choice" ? "active" : ""} type="button" onClick={() => setType("multiple_choice")}>
          Multiple choice
        </button>
        <button className={question.type === "drag_and_drop" ? "active" : ""} type="button" onClick={() => setType("drag_and_drop")}>
          Drag and drop
        </button>
        <button className={question.type === "table_drag_and_drop" ? "active" : ""} type="button" onClick={() => setType("table_drag_and_drop")}>
          Tabla
        </button>
      </div>

      <label>
        Enunciado
        <textarea value={question.statement} onChange={(event) => onChange({ ...question, statement: event.target.value, ocrText: draft.text })} />
      </label>

      {question.type === "multiple_choice" ? (
        <MultipleChoiceEditor
          options={question.options}
          correctAnswer={question.correctAnswer}
          onOptionsChange={(options) => onChange({ ...question, options, ocrText: draft.text })}
          onCorrectAnswerChange={(correctAnswer) => onChange({ ...question, correctAnswer, ocrText: draft.text })}
        />
      ) : question.type === "drag_and_drop" ? (
        <>
          <DragDropEditor
            textPartsRaw={textPartsRaw}
            draggableOptions={question.draggableOptions}
            correctAnswers={question.correctAnswers}
            blankCount={blankCount}
            onTextPartsRawChange={(value) =>
              onChange({
                ...question,
                textParts: value.split("|").map((part) => part.trim()).filter(Boolean),
                ocrText: draft.text
              })
            }
            onDraggableOptionsChange={(draggableOptions) => onChange({ ...question, draggableOptions, ocrText: draft.text })}
            onCorrectAnswersChange={(correctAnswers) => onChange({ ...question, correctAnswers, ocrText: draft.text })}
          />
          <div className="word-picker">
            <span>Marcar palabra como blank correcto</span>
            <div>
              {words.map((word) => (
                <button className="chip" key={word} type="button" onClick={() => markBlank(word)}>
                  {word}
                </button>
              ))}
            </div>
          </div>
          <DragPreview question={question} onChange={onChange} ocrText={draft.text} />
        </>
      ) : (
        <TableQuestionEditor
          table={question.table}
          options={question.draggableOptions}
          onTableChange={(table) => onChange({ ...question, table, ocrText: draft.text })}
          onOptionsChange={(draggableOptions) => onChange({ ...question, draggableOptions, ocrText: draft.text })}
        />
      )}
    </article>
  );
}

function DragPreview({
  question,
  onChange,
  ocrText
}: {
  question: Omit<DragAndDropQuestion, "id">;
  onChange: (question: QuestionInput) => void;
  ocrText: string;
}) {
  function moveAnswer(index: number, direction: -1 | 1) {
    const next = [...question.correctAnswers];
    const target = index + direction;
    if (target < 0 || target >= next.length) {
      return;
    }
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ ...question, correctAnswers: next, ocrText });
  }

  return (
    <div className="preview-panel">
      <strong>Vista previa</strong>
      <p>
        {question.textParts.map((part, index) =>
          part === "__blank__" ? (
            <span className="inline-blank" key={index}>
              blank
            </span>
          ) : (
            <span key={`${part}-${index}`}>{part} </span>
          )
        )}
      </p>
      <div className="ordered-answers">
        {question.correctAnswers.map((answer, index) => (
          <div className="answer-order-row" key={`${answer}-${index}`}>
            <span>
              {index + 1}. {answer}
            </span>
            <button className="icon-button" type="button" onClick={() => moveAnswer(index, -1)} aria-label="Subir respuesta">
              <ArrowUp size={16} />
            </button>
            <button className="icon-button" type="button" onClick={() => moveAnswer(index, 1)} aria-label="Bajar respuesta">
              <ArrowDown size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function uniqueWords(text: string) {
  return Array.from(
    new Set(
      text
        .replace(/[^\w\sáéíóúñüÁÉÍÓÚÑÜ-]/g, " ")
        .split(/\s+/)
        .map((word) => word.trim())
        .filter((word) => word.length > 3)
    )
  );
}

function questionTypeLabel(type: QuestionType) {
  if (type === "multiple_choice") {
    return "Multiple choice";
  }
  if (type === "drag_and_drop") {
    return "Drag and drop";
  }
  return "Tabla drag";
}

function AdminPage({ questions, onChange }: { questions: Question[]; onChange: () => Promise<void> }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState<QuestionType>("multiple_choice");
  const [statement, setStatement] = useState("");
  const [options, setOptions] = useState<string[]>(emptyMc.options);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [textPartsRaw, setTextPartsRaw] = useState("El | __blank__ | se visualiza en la linea de optimalidad");
  const [draggableOptions, setDraggableOptions] = useState<string[]>(emptyDnd.draggableOptions);
  const [correctAnswers, setCorrectAnswers] = useState<string[]>(emptyDnd.correctAnswers);
  const [table, setTable] = useState<DragTable>(emptyTable.table);
  const [tableOptions, setTableOptions] = useState<string[]>(emptyTable.draggableOptions);
  const [message, setMessage] = useState("");

  const blankCount = useMemo(
    () =>
      textPartsRaw
        .split("|")
        .map((part) => part.trim())
        .filter((part) => part === "__blank__").length,
    [textPartsRaw]
  );

  function resetForm(nextType: QuestionType = type) {
    setEditingId(null);
    setType(nextType);
    setStatement("");
    setMessage("");
    if (nextType === "multiple_choice") {
      setOptions(["", ""]);
      setCorrectAnswer("");
    } else if (nextType === "drag_and_drop") {
      setTextPartsRaw("El | __blank__ | se visualiza en la linea de optimalidad");
      setDraggableOptions(["", "", ""]);
      setCorrectAnswers([""]);
    } else {
      setTable(makeEmptyTable(3, 3));
      setTableOptions(["", "", ""]);
    }
  }

  function edit(question: Question) {
    setEditingId(question.id);
    setType(question.type);
    setStatement(question.statement);
    setMessage("");
    if (question.type === "multiple_choice") {
      setOptions(question.options);
      setCorrectAnswer(question.correctAnswer);
    } else if (question.type === "drag_and_drop") {
      setTextPartsRaw(question.textParts.join(" | "));
      setDraggableOptions(question.draggableOptions);
      setCorrectAnswers(question.correctAnswers);
    } else {
      setTable(question.table);
      setTableOptions(question.draggableOptions);
    }
  }

  async function save() {
    setMessage("");
    try {
      const payload: QuestionInput =
        type === "multiple_choice"
          ? {
              type,
              statement: statement.trim(),
              options: cleanList(options),
              correctAnswer: correctAnswer.trim()
            }
          : type === "drag_and_drop"
            ? {
                type,
                statement: statement.trim(),
                textParts: textPartsRaw.split("|").map((part) => part.trim()).filter(Boolean),
                draggableOptions: cleanList(draggableOptions),
                correctAnswers: cleanList(correctAnswers)
              }
            : {
                type,
                statement: statement.trim(),
                table,
                draggableOptions: cleanList([...tableOptions, ...tableBlankCells(table).map((cell) => cell.correctAnswer ?? "")])
              };

      if (editingId) {
        await updateQuestion(editingId, normalizeQuestionInput(payload));
      } else {
        await createQuestion(normalizeQuestionInput(payload));
      }

      await onChange();
      resetForm(type);
      setMessage("Pregunta guardada.");
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "No se pudo guardar.");
    }
  }

  async function remove(id: string) {
    await deleteQuestion(id);
    await onChange();
    if (editingId === id) {
      resetForm(type);
    }
  }

  return (
    <main className="main admin-grid">
      <section className="editor-panel">
        <div className="section-title">
          <h1>{editingId ? "Editar pregunta" : "Nueva pregunta"}</h1>
          <button className="ghost-button" type="button" onClick={() => resetForm(type)}>
            <Plus size={18} />
            Nueva
          </button>
        </div>

        <div className="segmented">
          <button className={type === "multiple_choice" ? "active" : ""} type="button" onClick={() => resetForm("multiple_choice")}>
            Multiple choice
          </button>
          <button className={type === "drag_and_drop" ? "active" : ""} type="button" onClick={() => resetForm("drag_and_drop")}>
            Drag and drop
          </button>
          <button className={type === "table_drag_and_drop" ? "active" : ""} type="button" onClick={() => resetForm("table_drag_and_drop")}>
            Tabla
          </button>
        </div>

        <label>
          Enunciado
          <textarea value={statement} onChange={(event) => setStatement(event.target.value)} placeholder="Escribi la consigna..." />
        </label>

        {type === "multiple_choice" ? (
          <MultipleChoiceEditor
            options={options}
            correctAnswer={correctAnswer}
            onOptionsChange={setOptions}
            onCorrectAnswerChange={setCorrectAnswer}
          />
        ) : type === "drag_and_drop" ? (
          <DragDropEditor
            textPartsRaw={textPartsRaw}
            draggableOptions={draggableOptions}
            correctAnswers={correctAnswers}
            blankCount={blankCount}
            onTextPartsRawChange={setTextPartsRaw}
            onDraggableOptionsChange={setDraggableOptions}
            onCorrectAnswersChange={setCorrectAnswers}
          />
        ) : (
          <TableQuestionEditor table={table} options={tableOptions} onTableChange={setTable} onOptionsChange={setTableOptions} />
        )}

        {message ? <p className="form-message">{message}</p> : null}
        <button className="primary-button" type="button" onClick={save}>
          <Save size={18} />
          Guardar pregunta
        </button>
      </section>

      <section className="list-panel">
        <h1>Preguntas cargadas</h1>
        <div className="question-list">
          {questions.map((question) => (
            <article className="question-item" key={question.id}>
              <div>
                <span className="type-pill">{questionTypeLabel(question.type)}</span>
                <h2>{question.statement}</h2>
              </div>
              <div className="item-actions">
                <button className="icon-button" type="button" onClick={() => edit(question)} aria-label="Editar">
                  <Pencil size={18} />
                </button>
                <button className="icon-button danger" type="button" onClick={() => remove(question.id)} aria-label="Eliminar">
                  <Trash2 size={18} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function MultipleChoiceEditor({
  options,
  correctAnswer,
  onOptionsChange,
  onCorrectAnswerChange
}: {
  options: string[];
  correctAnswer: string;
  onOptionsChange: (options: string[]) => void;
  onCorrectAnswerChange: (answer: string) => void;
}) {
  return (
    <>
      <ArrayEditor label="Opciones" values={options} minItems={2} onChange={onOptionsChange} />
      <label>
        Respuesta correcta
        <select value={correctAnswer} onChange={(event) => onCorrectAnswerChange(event.target.value)}>
          <option value="">Elegir opcion</option>
          {cleanList(options).map((option) => (
            <option value={option} key={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

function DragDropEditor({
  textPartsRaw,
  draggableOptions,
  correctAnswers,
  blankCount,
  onTextPartsRawChange,
  onDraggableOptionsChange,
  onCorrectAnswersChange
}: {
  textPartsRaw: string;
  draggableOptions: string[];
  correctAnswers: string[];
  blankCount: number;
  onTextPartsRawChange: (value: string) => void;
  onDraggableOptionsChange: (values: string[]) => void;
  onCorrectAnswersChange: (values: string[]) => void;
}) {
  return (
    <>
      <label>
        Frase con blanks
        <textarea value={textPartsRaw} onChange={(event) => onTextPartsRawChange(event.target.value)} />
        <small>Separá partes con | y usá __blank__ donde va un espacio. Blanks detectados: {blankCount}</small>
      </label>
      <ArrayEditor label="Opciones arrastrables" values={draggableOptions} minItems={1} onChange={onDraggableOptionsChange} />
      <ArrayEditor label="Respuestas correctas en orden" values={correctAnswers} minItems={1} onChange={onCorrectAnswersChange} />
    </>
  );
}

function TableQuestionEditor({
  table,
  options,
  onTableChange,
  onOptionsChange
}: {
  table: DragTable;
  options: string[];
  onTableChange: (table: DragTable) => void;
  onOptionsChange: (options: string[]) => void;
}) {
  function resize(rows: number, columns: number) {
    const safeRows = Math.max(1, rows);
    const safeColumns = Math.max(1, columns);
    const cells = Array.from({ length: safeRows * safeColumns }, (_, index) => {
      const row = Math.floor(index / safeColumns);
      const col = index % safeColumns;
      return (
        table.cells.find((cell) => cell.row === row && cell.col === col) ?? {
          row,
          col,
          content: "",
          isBlank: false,
          correctAnswer: ""
        }
      );
    });
    onTableChange({ rows: safeRows, columns: safeColumns, cells });
  }

  function updateCell(row: number, col: number, patch: Partial<DragTable["cells"][number]>) {
    onTableChange({
      ...table,
      cells: table.cells.map((cell) => (cell.row === row && cell.col === col ? { ...cell, ...patch } : cell))
    });
  }

  return (
    <>
      <div className="dimension-grid">
        <label>
          Filas
          <input min={1} type="number" value={table.rows} onChange={(event) => resize(Number(event.target.value), table.columns)} />
        </label>
        <label>
          Columnas
          <input min={1} type="number" value={table.columns} onChange={(event) => resize(table.rows, Number(event.target.value))} />
        </label>
      </div>

      <div className="table-editor-wrap">
        <table className="table-editor">
          <tbody>
            {Array.from({ length: table.rows }, (_, row) => (
              <tr key={row}>
                {Array.from({ length: table.columns }, (_, col) => {
                  const cell = table.cells.find((item) => item.row === row && item.col === col)!;
                  return (
                    <td key={`${row}-${col}`}>
                      <label className="cell-toggle">
                        <input
                          checked={cell.isBlank}
                          type="checkbox"
                          onChange={(event) => updateCell(row, col, { isBlank: event.target.checked })}
                        />
                        Blank
                      </label>
                      {cell.isBlank ? (
                        <input
                          value={cell.correctAnswer ?? ""}
                          onChange={(event) => updateCell(row, col, { correctAnswer: event.target.value, content: "" })}
                          placeholder="Respuesta correcta"
                        />
                      ) : (
                        <input
                          value={cell.content}
                          onChange={(event) => updateCell(row, col, { content: event.target.value, correctAnswer: "" })}
                          placeholder="Contenido fijo"
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ArrayEditor label="Opciones arrastrables y distractores" values={options} minItems={1} onChange={onOptionsChange} />
      <TablePreview table={table} />
    </>
  );
}

function TablePreview({ table }: { table: DragTable }) {
  return (
    <div className="preview-panel">
      <strong>Vista previa de tabla</strong>
      <div className="study-table-wrap">
        <table className="study-table">
          <tbody>
            {Array.from({ length: table.rows }, (_, row) => (
              <tr key={row}>
                {Array.from({ length: table.columns }, (_, col) => {
                  const cell = table.cells.find((item) => item.row === row && item.col === col);
                  return (
                    <td className={cell?.isBlank ? "table-blank-cell" : ""} key={`${row}-${col}`}>
                      {cell?.isBlank ? <span className="blank-placeholder">{cell.correctAnswer || "blank"}</span> : cell?.content}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ArrayEditor({
  label,
  values,
  minItems,
  onChange
}: {
  label: string;
  values: string[];
  minItems: number;
  onChange: (values: string[]) => void;
}) {
  function update(index: number, value: string) {
    onChange(values.map((item, itemIndex) => (itemIndex === index ? value : item)));
  }

  function remove(index: number) {
    if (values.length <= minItems) {
      return;
    }
    onChange(values.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <div className="array-editor">
      <div className="array-header">
        <span>{label}</span>
        <button className="ghost-button" type="button" onClick={() => onChange([...values, ""])}>
          <Plus size={16} />
          Agregar
        </button>
      </div>
      {values.map((value, index) => (
        <div className="array-row" key={index}>
          <input value={value} onChange={(event) => update(index, event.target.value)} placeholder={`${label} ${index + 1}`} />
          <button className="icon-button" type="button" onClick={() => remove(index)} aria-label="Eliminar item">
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
