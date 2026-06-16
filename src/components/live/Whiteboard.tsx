import React, { useRef, useState, useEffect } from "react";
import {
  Paintbrush,
  Square,
  Circle as CircleIcon,
  Type,
  Eraser,
  Trash2,
  Undo,
  ChevronRight,
  ChevronLeft,
  FileImage,
} from "lucide-react";

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  type: "draw" | "rect" | "circle" | "text";
  points: Point[];
  color: string;
  width: number;
  text?: string;
}

interface WhiteboardProps {
  socket: any;
  sessionId: string;
  isTeacher: boolean;
  initialStrokes?: Stroke[];
  initialBackground?: string | null;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({
  socket,
  sessionId,
  isTeacher,
  initialStrokes = [],
  initialBackground = null,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<"draw" | "rect" | "circle" | "text" | "eraser">("draw");
  const [color, setColor] = useState("#4f46e5");
  const [brushWidth, setBrushWidth] = useState(3);
  const [strokes, setStrokes] = useState<Stroke[]>(initialStrokes);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(initialBackground);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [textInput, setTextInput] = useState("");
  const [textPos, setTextPos] = useState<Point | null>(null);

  // Background Image Cache
  const bgImageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Responsive size
    canvas.width = canvas.parentElement?.clientWidth || 800;
    canvas.height = canvas.parentElement?.clientHeight || 500;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.lineCap = "round";
    context.lineJoin = "round";
    contextRef.current = context;

    redrawCanvas();
  }, []);

  // Sync background changes
  useEffect(() => {
    if (backgroundUrl) {
      const img = new Image();
      img.src = backgroundUrl;
      img.onload = () => {
        bgImageRef.current = img;
        redrawCanvas();
      };
    } else {
      bgImageRef.current = null;
      redrawCanvas();
    }
  }, [backgroundUrl]);

  // Recalculate canvas on resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = canvas.parentElement?.clientWidth || 800;
      canvas.height = canvas.parentElement?.clientHeight || 500;
      redrawCanvas();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [strokes]);

  // Socket sync listeners
  useEffect(() => {
    if (!socket) return;

    socket.on("whiteboard-draw", (stroke: Stroke) => {
      setStrokes((prev) => {
        const next = [...prev, stroke];
        setTimeout(() => redrawCanvas(), 0);
        return next;
      });
    });

    socket.on("whiteboard-clear", () => {
      setStrokes([]);
      setBackgroundUrl(null);
      bgImageRef.current = null;
      setTimeout(() => redrawCanvas(), 0);
    });

    socket.on("whiteboard-bg", (url: string | null) => {
      setBackgroundUrl(url);
    });

    // Clean up
    return () => {
      socket.off("whiteboard-draw");
      socket.off("whiteboard-clear");
      socket.off("whiteboard-bg");
    };
  }, [socket]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background image if any
    if (bgImageRef.current) {
      // scale aspect ratio to fit canvas
      const img = bgImageRef.current;
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const x = (canvas.width - img.width * scale) / 2;
      const y = (canvas.height - img.height * scale) / 2;
      context.drawImage(img, x, y, img.width * scale, img.height * scale);
    }

    // Render all strokes
    strokes.forEach((stroke) => {
      context.beginPath();
      context.strokeStyle = stroke.color;
      context.lineWidth = stroke.width;

      if (stroke.type === "draw") {
        if (stroke.points.length > 0) {
          context.moveTo(stroke.points[0].x, stroke.points[0].y);
          for (let i = 1; i < stroke.points.length; i++) {
            context.lineTo(stroke.points[i].x, stroke.points[i].y);
          }
          context.stroke();
        }
      } else if (stroke.type === "rect") {
        if (stroke.points.length >= 2) {
          const start = stroke.points[0];
          const end = stroke.points[1];
          context.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
        }
      } else if (stroke.type === "circle") {
        if (stroke.points.length >= 2) {
          const start = stroke.points[0];
          const end = stroke.points[1];
          const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
          context.arc(start.x, start.y, radius, 0, 2 * Math.PI);
          context.stroke();
        }
      } else if (stroke.type === "text" && stroke.text) {
        if (stroke.points.length > 0) {
          context.font = `${stroke.width * 5 + 12}px Cairo, sans-serif`;
          context.fillStyle = stroke.color;
          context.fillText(stroke.text, stroke.points[0].x, stroke.points[0].y);
        }
      }
    });
  };

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    // Check if touch event
    if ("touches" in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    // Only teacher can edit whiteboard unless student draws? No, teacher studio typically controls whiteboard edits,
    // but we can allow teachers to write and students to view.
    if (!isTeacher) return;

    const coords = getCoordinates(e);
    setIsDrawing(true);
    setStartPoint(coords);

    if (tool === "draw" || tool === "eraser") {
      contextRef.current?.beginPath();
      contextRef.current?.moveTo(coords.x, coords.y);
    } else if (tool === "text") {
      setTextPos(coords);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isTeacher) return;
    const coords = getCoordinates(e);
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    if (tool === "draw" || tool === "eraser") {
      context.lineTo(coords.x, coords.y);
      context.strokeStyle = tool === "eraser" ? "#ffffff" : color;
      context.lineWidth = brushWidth;
      context.stroke();

      // Update points in temporary local stroke
      setStartPoint((prev) => {
        if (prev) {
          // Store all drag coordinates
          (socket.data_points = socket.data_points || []).push(coords);
        }
        return prev;
      });
    } else {
      // Preview rectangle/circle shapes
      redrawCanvas();
      context.beginPath();
      context.strokeStyle = color;
      context.lineWidth = brushWidth;
      if (tool === "rect" && startPoint) {
        context.strokeRect(
          startPoint.x,
          startPoint.y,
          coords.x - startPoint.x,
          coords.y - startPoint.y,
        );
      } else if (tool === "circle" && startPoint) {
        const radius = Math.sqrt(
          Math.pow(coords.x - startPoint.x, 2) + Math.pow(coords.y - startPoint.y, 2),
        );
        context.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
        context.stroke();
      }
    }
  };

  const stopDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if (!isDrawing || !isTeacher) return;
    setIsDrawing(false);

    const coords = getCoordinates(e);
    let finalStroke: Stroke | null = null;

    if (tool === "draw" || tool === "eraser") {
      const points = socket.data_points || [];
      socket.data_points = []; // reset
      if (startPoint) {
        points.unshift(startPoint);
      }
      finalStroke = {
        type: "draw",
        points,
        color: tool === "eraser" ? "#ffffff" : color,
        width: brushWidth,
      };
    } else if (tool === "rect" && startPoint) {
      finalStroke = {
        type: "rect",
        points: [startPoint, coords],
        color,
        width: brushWidth,
      };
    } else if (tool === "circle" && startPoint) {
      finalStroke = {
        type: "circle",
        points: [startPoint, coords],
        color,
        width: brushWidth,
      };
    }

    if (finalStroke && finalStroke.points.length > 0) {
      setStrokes((prev) => [...prev, finalStroke!]);
      socket.emit("whiteboard-draw", finalStroke);
      redrawCanvas();
    }
  };

  const handleTextStamp = () => {
    if (!textPos || !textInput.trim() || !isTeacher) return;

    const textStroke: Stroke = {
      type: "text",
      points: [textPos],
      color,
      width: brushWidth,
      text: textInput,
    };

    setStrokes((prev) => [...prev, textStroke]);
    socket.emit("whiteboard-draw", textStroke);
    redrawCanvas();

    setTextInput("");
    setTextPos(null);
  };

  const clearCanvas = () => {
    if (!isTeacher) return;
    setStrokes([]);
    setBackgroundUrl(null);
    bgImageRef.current = null;
    socket.emit("whiteboard-clear");
    redrawCanvas();
  };

  const setSlideBackground = (url: string) => {
    if (!isTeacher) return;
    setBackgroundUrl(url);
    socket.emit("whiteboard-bg", url);
  };

  const undoLast = () => {
    if (!isTeacher || strokes.length === 0) return;
    const newStrokes = strokes.slice(0, -1);
    setStrokes(newStrokes);

    // We emit clear and redraw all to sync
    socket.emit("whiteboard-clear");
    newStrokes.forEach((s) => socket.emit("whiteboard-draw", s));
    if (backgroundUrl) socket.emit("whiteboard-bg", backgroundUrl);

    redrawCanvas();
  };

  // Demo PDF slide controls
  const demoSlides = [
    "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=1000&auto=format&fit=crop",
  ];
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const loadSlide = (idx: number) => {
    setCurrentSlideIndex(idx);
    setSlideBackground(demoSlides[idx]);
  };

  return (
    <div className="relative flex flex-col w-full h-full bg-white rounded-2xl overflow-hidden border border-border/80 shadow-elevated">
      {/* Teacher controls header */}
      {isTeacher && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border-b border-border/80"
          dir="rtl"
        >
          {/* Tools */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setTool("draw")}
              className={`p-2 rounded-xl transition-all cursor-pointer ${tool === "draw" ? "bg-primary text-white" : "hover:bg-slate-200 text-slate-700"}`}
              title="قلم حر"
            >
              <Paintbrush className="size-4" />
            </button>
            <button
              onClick={() => setTool("rect")}
              className={`p-2 rounded-xl transition-all cursor-pointer ${tool === "rect" ? "bg-primary text-white" : "hover:bg-slate-200 text-slate-700"}`}
              title="مستطيل"
            >
              <Square className="size-4" />
            </button>
            <button
              onClick={() => setTool("circle")}
              className={`p-2 rounded-xl transition-all cursor-pointer ${tool === "circle" ? "bg-primary text-white" : "hover:bg-slate-200 text-slate-700"}`}
              title="دائرة"
            >
              <CircleIcon className="size-4" />
            </button>
            <button
              onClick={() => setTool("text")}
              className={`p-2 rounded-xl transition-all cursor-pointer ${tool === "text" ? "bg-primary text-white" : "hover:bg-slate-200 text-slate-700"}`}
              title="نص"
            >
              <Type className="size-4" />
            </button>
            <button
              onClick={() => setTool("eraser")}
              className={`p-2 rounded-xl transition-all cursor-pointer ${tool === "eraser" ? "bg-primary text-white" : "hover:bg-slate-200 text-slate-700"}`}
              title="ممحاة"
            >
              <Eraser className="size-4" />
            </button>
          </div>

          {/* Color palette */}
          {tool !== "eraser" && (
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-border">
              {["#4f46e5", "#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#1e293b"].map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`size-6 rounded-lg transition-transform cursor-pointer ${color === c ? "scale-110 ring-2 ring-primary/40" : "hover:scale-105"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}

          {/* Width slider */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">الحجم:</span>
            <input
              type="range"
              min="1"
              max="20"
              value={brushWidth}
              onChange={(e) => setBrushWidth(parseInt(e.target.value))}
              className="w-20 accent-primary"
            />
            <span className="text-xs font-bold text-slate-700 w-5 text-center">{brushWidth}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={undoLast}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
              title="تراجع"
            >
              <Undo className="size-3.5" />
              تراجع
            </button>
            <button
              onClick={clearCanvas}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
              title="مسح الكل"
            >
              <Trash2 className="size-3.5" />
              مسح الكل
            </button>
          </div>

          {/* PDF/Slides navigation */}
          <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-border">
            <button
              onClick={() => loadSlide(Math.max(0, currentSlideIndex - 1))}
              disabled={currentSlideIndex === 0}
              className="p-1 rounded hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="size-4" />
            </button>
            <span className="text-xs font-display font-bold text-slate-700">
              شريحة {currentSlideIndex + 1} / {demoSlides.length}
            </span>
            <button
              onClick={() => loadSlide(Math.min(demoSlides.length - 1, currentSlideIndex + 1))}
              disabled={currentSlideIndex === demoSlides.length - 1}
              className="p-1 rounded hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() => setSlideBackground(demoSlides[currentSlideIndex])}
              className="p-1 rounded hover:bg-slate-100 text-primary cursor-pointer"
              title="عرض الشريحة كخلفية"
            >
              <FileImage className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Canvas Area */}
      <div className="relative flex-1 bg-slate-100/50 overflow-hidden min-h-[350px]">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={`absolute inset-0 w-full h-full ${isTeacher ? "cursor-crosshair" : "cursor-default pointer-events-none"}`}
        />

        {/* Text Input floating box */}
        {textPos && (
          <div
            className="absolute z-10 flex gap-1 bg-white p-2 rounded-xl shadow-lg border border-border"
            style={{ left: textPos.x, top: textPos.y - 45 }}
            dir="rtl"
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="اكتب هنا..."
              className="px-2 py-1 text-xs border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary font-display w-36"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTextStamp();
                if (e.key === "Escape") setTextPos(null);
              }}
            />
            <button
              onClick={handleTextStamp}
              className="px-2 py-1 bg-primary text-white text-[10px] font-bold rounded-lg cursor-pointer"
            >
              إضافة
            </button>
            <button
              onClick={() => setTextPos(null)}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded-lg cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
