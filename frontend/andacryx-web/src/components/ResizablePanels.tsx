import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import "./ResizablePanels.css";

type Props = {
  left: ReactNode;
  right: ReactNode;
  defaultRatio?: number;
  minRatio?: number;
  maxRatio?: number;
  storageKey?: string;
};

export default function ResizablePanels({
  left,
  right,
  defaultRatio = 55,
  minRatio = 25,
  maxRatio = 75,
  storageKey = "andacryx.workspace.splitRatio",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  const clamp = (value: number) =>
    Math.max(minRatio, Math.min(maxRatio, value));

  const [ratio, setRatio] = useState(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved !== null) {
        const value = Number(saved);
        if (Number.isFinite(value)) return clamp(value);
      }
    } catch {
      // Storage unavailable: use default ratio.
    }

    return clamp(defaultRatio);
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, String(ratio));
    } catch {
      // Storage unavailable: resizing still works in memory.
    }
  }, [ratio, storageKey]);

  function updateRatio(clientX: number) {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width <= 0) return;

    setRatio(clamp(((clientX - bounds.left) / bounds.width) * 100));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;

    draggingRef.current = true;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    updateRatio(event.clientX);
    event.preventDefault();
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (draggingRef.current) updateRatio(event.clientX);
  }

  function stopDragging() {
    draggingRef.current = false;
    setDragging(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      setRatio((current) =>
        clamp(current + (event.key === "ArrowLeft" ? -5 : 5)),
      );
    }

    if (event.key === "Home") {
      event.preventDefault();
      setRatio(minRatio);
    }

    if (event.key === "End") {
      event.preventDefault();
      setRatio(maxRatio);
    }
  }

  useEffect(() => {
    if (!dragging) return;

    const previousCursor = document.body.style.cursor;
    const previousSelection = document.body.style.userSelect;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelection;
    };
  }, [dragging]);

  return (
    <div
      ref={containerRef}
      className={`resizable-panels ${dragging ? "is-dragging" : ""}`}
      style={{
        gridTemplateColumns: `minmax(0, ${ratio}fr) 8px minmax(0, ${100 - ratio}fr)`,
      }}
    >
      <div className="resizable-panel">{left}</div>

      <div
        className="resizable-divider"
        role="separator"
        aria-label="Panel genişliklerini ayarla"
        aria-orientation="vertical"
        aria-valuemin={minRatio}
        aria-valuemax={maxRatio}
        aria-valuenow={Math.round(ratio)}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onLostPointerCapture={stopDragging}
        onDoubleClick={() => setRatio(clamp(defaultRatio))}
        onKeyDown={handleKeyDown}
        title="Sürükleyerek boyutlandır, çift tıklayarak sıfırla"
      >
        <span className="resizable-divider-grip" />
      </div>

      <div className="resizable-panel">{right}</div>
    </div>
  );
}
