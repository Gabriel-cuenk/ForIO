export type QuestionType = "multiple_choice" | "drag_and_drop";

export type MultipleChoiceQuestion = {
  id: string;
  type: "multiple_choice";
  statement: string;
  options: string[];
  correctAnswer: string;
  ocrText?: string;
};

export type DragAndDropQuestion = {
  id: string;
  type: "drag_and_drop";
  statement: string;
  textParts: string[];
  draggableOptions: string[];
  correctAnswers: string[];
  ocrText?: string;
};

export type Question = MultipleChoiceQuestion | DragAndDropQuestion;
export type QuestionInput = Omit<Question, "id">;
