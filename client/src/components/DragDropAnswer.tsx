import { DndContext, DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

type BlankAnswers = Record<number, string | null>;

type Props = {
  textParts: string[];
  options: string[];
  disabled?: boolean;
  onChange: (answers: string[]) => void;
};

const bankId = "bank";

function DraggableOption({ value, id, disabled }: { value: string; id: string; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, disabled, data: { value } });
  const style: CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.45 : 1
  };

  return (
    <button ref={setNodeRef} type="button" className="chip draggable-chip" style={style} {...listeners} {...attributes}>
      {value}
    </button>
  );
}

function DroppableSlot({
  id,
  className,
  children
}: {
  id: string;
  className: string;
  children: ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <span ref={setNodeRef} className={`${className} ${isOver ? "drop-over" : ""}`}>
      {children}
    </span>
  );
}

export default function DragDropAnswer({ textParts, options, disabled = false, onChange }: Props) {
  const blankIndexes = useMemo(
    () => textParts.map((part, index) => (part === "__blank__" ? index : -1)).filter((index) => index >= 0),
    [textParts]
  );
  const [answers, setAnswers] = useState<BlankAnswers>(() =>
    Object.fromEntries(blankIndexes.map((index) => [index, null]))
  );
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const usedOptions = new Set(Object.values(answers).filter(Boolean));
  const bankOptions = options.filter((option) => !usedOptions.has(option));

  function emit(nextAnswers: BlankAnswers) {
    onChange(blankIndexes.map((index) => nextAnswers[index] ?? ""));
  }

  function moveOption(value: string, targetId: string) {
    const nextAnswers = { ...answers };
    for (const index of blankIndexes) {
      if (nextAnswers[index] === value) {
        nextAnswers[index] = null;
      }
    }

    if (targetId !== bankId) {
      const targetIndex = Number(targetId.replace("blank-", ""));
      if (Number.isFinite(targetIndex)) {
        nextAnswers[targetIndex] = value;
      }
    }

    setAnswers(nextAnswers);
    emit(nextAnswers);
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over || disabled) {
      return;
    }

    const activeValue = String(event.active.data.current?.value ?? event.active.id);
    moveOption(activeValue, String(event.over.id));
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="sentence">
        {textParts.map((part, index) => {
          if (part !== "__blank__") {
            return <span key={`${part}-${index}`}>{part} </span>;
          }

          const value = answers[index];
          return (
            <DroppableSlot key={index} id={`blank-${index}`} className="blank">
              {value ? (
                <DraggableOption id={`placed-${index}-${value}`} value={value} disabled={disabled} />
              ) : (
                <span className="blank-placeholder">soltar aca</span>
              )}
            </DroppableSlot>
          );
        })}
      </div>

      <DroppableSlot id={bankId} className="option-bank">
        {bankOptions.length === 0 ? <span className="bank-empty">Arrastra una opcion aca para devolverla</span> : null}
        {bankOptions.map((option) => (
          <DraggableOption key={option} id={`bank-${option}`} value={option} disabled={disabled} />
        ))}
      </DroppableSlot>
    </DndContext>
  );
}
