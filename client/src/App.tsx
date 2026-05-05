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
import type { DragAndDropQuestion, MultipleChoiceQuestion, Question, QuestionInput, QuestionType } from "./types/questions";

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

function cleanList(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
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
  const [checked, setChecked] = useState<null | boolean>(null);
  const question = questions[index];
  const isFinished = index >= questions.length;

  function resetAnswer() {
    setSelected("");
    setDndAnswers([]);
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

    const isCorrect =
      question.type === "multiple_choice"
        ? selected === question.correctAnswer
        : question.correctAnswers.every((answer, answerIndex) => dndAnswers[answerIndex] === answer);

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

  const canValidate = question.type === "multiple_choice" ? Boolean(selected) : dndAnswers.filter(Boolean).length === question.correctAnswers.length;

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
        ) : (
          <DragDropAnswer
            key={question.id}
            textParts={question.textParts}
            options={question.draggableOptions}
            disabled={checked !== null}
            onChange={setDndAnswers}
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
  const correctText = question.type === "multiple_choice" ? question.correctAnswer : question.correctAnswers.join(" / ");
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
      await createQuestionsBulk(drafts.map((draft) => ({ ...draft.parsedQuestion, ocrText: draft.text })));
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
        options: question.type === "drag_and_drop" ? question.draggableOptions : question.options,
        correctAnswer: question.type === "drag_and_drop" ? question.correctAnswers[0] ?? "" : question.correctAnswer,
        ocrText: draft.text
      });
      return;
    }

    const answer = question.type === "multiple_choice" ? question.correctAnswer : question.correctAnswers[0] ?? "";
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
      ) : (
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

function AdminPage({ questions, onChange }: { questions: Question[]; onChange: () => Promise<void> }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState<QuestionType>("multiple_choice");
  const [statement, setStatement] = useState("");
  const [options, setOptions] = useState<string[]>(emptyMc.options);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [textPartsRaw, setTextPartsRaw] = useState("El | __blank__ | se visualiza en la linea de optimalidad");
  const [draggableOptions, setDraggableOptions] = useState<string[]>(emptyDnd.draggableOptions);
  const [correctAnswers, setCorrectAnswers] = useState<string[]>(emptyDnd.correctAnswers);
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
    } else {
      setTextPartsRaw("El | __blank__ | se visualiza en la linea de optimalidad");
      setDraggableOptions(["", "", ""]);
      setCorrectAnswers([""]);
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
    } else {
      setTextPartsRaw(question.textParts.join(" | "));
      setDraggableOptions(question.draggableOptions);
      setCorrectAnswers(question.correctAnswers);
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
          : {
              type,
              statement: statement.trim(),
              textParts: textPartsRaw.split("|").map((part) => part.trim()).filter(Boolean),
              draggableOptions: cleanList(draggableOptions),
              correctAnswers: cleanList(correctAnswers)
            };

      if (editingId) {
        await updateQuestion(editingId, payload);
      } else {
        await createQuestion(payload);
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
        ) : (
          <DragDropEditor
            textPartsRaw={textPartsRaw}
            draggableOptions={draggableOptions}
            correctAnswers={correctAnswers}
            blankCount={blankCount}
            onTextPartsRawChange={setTextPartsRaw}
            onDraggableOptionsChange={setDraggableOptions}
            onCorrectAnswersChange={setCorrectAnswers}
          />
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
                <span className="type-pill">{question.type === "multiple_choice" ? "Multiple choice" : "Drag and drop"}</span>
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
