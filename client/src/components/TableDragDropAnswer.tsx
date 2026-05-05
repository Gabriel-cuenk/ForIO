import { DndContext, DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { DragTable } from "../types/questions";

type CellAnswers = Record<string, string | null>;

type Props = {
  table: DragTable;
  options: string[];
  disabled?: boolean;
  results?: Record<string, boolean>;
  onChange: (answers: Record<string, string>) => void;
};

const bankId = "table-bank";

function cellKey(row: number, col: number) {
  return `${row}-${col}`;
}

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

function DroppableBox({ id, className, children }: { id: string; className: string; children: ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? "drop-over" : ""}`}>
      {children}
    </div>
  );
}

export default function TableDragDropAnswer({ table, options, disabled = false, results, onChange }: Props) {
  const blankCells = useMemo(() => table.cells.filter((cell) => cell.isBlank), [table.cells]);
  const [answers, setAnswers] = useState<CellAnswers>(() =>
    Object.fromEntries(blankCells.map((cell) => [cellKey(cell.row, cell.col), null]))
  );
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const usedOptions = new Set(Object.values(answers).filter(Boolean));
  const bankOptions = options.filter((option) => !usedOptions.has(option));

  function emit(nextAnswers: CellAnswers) {
    onChange(Object.fromEntries(Object.entries(nextAnswers).map(([key, value]) => [key, value ?? ""])));
  }

  function moveOption(value: string, targetId: string) {
    const nextAnswers = { ...answers };
    for (const key of Object.keys(nextAnswers)) {
      if (nextAnswers[key] === value) {
        nextAnswers[key] = null;
      }
    }

    if (targetId !== bankId) {
      const key = targetId.replace("table-cell-", "");
      if (key in nextAnswers) {
        nextAnswers[key] = value;
      }
    }

    setAnswers(nextAnswers);
    emit(nextAnswers);
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over || disabled) {
      return;
    }
    moveOption(String(event.active.data.current?.value ?? event.active.id), String(event.over.id));
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="study-table-wrap">
        <table className="study-table">
          <tbody>
            {Array.from({ length: table.rows }, (_, row) => (
              <tr key={row}>
                {Array.from({ length: table.columns }, (_, col) => {
                  const cell = table.cells.find((item) => item.row === row && item.col === col);
                  const key = cellKey(row, col);
                  const value = answers[key];
                  const result = results?.[key];

                  return (
                    <td className={cell?.isBlank ? `table-blank-cell ${result === true ? "cell-correct" : ""} ${result === false ? "cell-incorrect" : ""}` : ""} key={key}>
                      {cell?.isBlank ? (
                        <DroppableBox id={`table-cell-${key}`} className="table-drop-cell">
                          {value ? (
                            <DraggableOption id={`placed-table-${key}-${value}`} value={value} disabled={disabled} />
                          ) : (
                            <span className="blank-placeholder">soltar aca</span>
                          )}
                        </DroppableBox>
                      ) : (
                        <span>{cell?.content}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DroppableBox id={bankId} className="option-bank">
        {bankOptions.length === 0 ? <span className="bank-empty">Arrastra una opcion aca para devolverla</span> : null}
        {bankOptions.map((option) => (
          <DraggableOption key={option} id={`table-bank-${option}`} value={option} disabled={disabled} />
        ))}
      </DroppableBox>
    </DndContext>
  );
}

export { cellKey };
