"use client";

import { useCallback, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extensions";

import { uploadImage } from "@/lib/upload-client";

/** Colores de texto de la toolbar. El primero limpia el color. */
const TEXT_COLORS = [
  { label: "Normal", value: null },
  { label: "Coral", value: "#e0603c" },
  { label: "Verde", value: "#1a9276" },
  { label: "Azul", value: "#1d4ed8" },
  { label: "Rojo", value: "#b91c1c" },
];

const HIGHLIGHTS = [
  { label: "Amarillo", value: "#fde68a" },
  { label: "Verde", value: "#bbf7d0" },
  { label: "Azul", value: "#bfdbfe" },
  { label: "Rosa", value: "#fbcfe8" },
];

export interface RichTextEditorProps {
  /** JSON de Tiptap con el que arranca el editor (al editar una noticia). */
  initialContent?: unknown;
  /** Se llama en cada cambio con el JSON y el HTML ya generados. */
  onChange: (value: { json: unknown; html: string }) => void;
  /**
   * `article` es el editor completo del cuerpo de una nota.
   * `headline` es el titular del lead de la portada: una sola línea, sin
   * encabezados ni listas ni imágenes, y con `highlight` reservado para el
   * recuadro invertido del diseño.
   */
  variant?: "article" | "headline";
  placeholder?: string;
}

export function RichTextEditor({
  initialContent,
  onChange,
  variant = "article",
  placeholder,
}: RichTextEditorProps) {
  const isHeadline = variant === "headline";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editor = useEditor({
    // Obligatorio en el App Router: sin esto el editor se renderiza en el
    // servidor y React reporta un desajuste de hidratación al montar.
    immediatelyRender: false,
    extensions: isHeadline
      ? [
          // Sin encabezados, listas, citas ni imágenes: es un titular.
          StarterKit.configure({
            heading: false,
            bulletList: false,
            orderedList: false,
            listItem: false,
            blockquote: false,
            codeBlock: false,
            code: false,
            horizontalRule: false,
            link: false,
          }),
          // Sin `multicolor`: queremos un <mark> pelón, que es lo que la clase
          // .kort-headline pinta como el recuadro invertido del diseño.
          Highlight,
          Placeholder.configure({
            placeholder: placeholder ?? "Titular de portada…",
          }),
        ]
      : [
          StarterKit.configure({
            heading: { levels: [1, 2, 3] },
            link: { openOnClick: false, autolink: true },
          }),
          TextStyle,
          Color,
          Highlight.configure({ multicolor: true }),
          Image.configure({ inline: false }),
          Placeholder.configure({ placeholder: placeholder ?? "Escribe la noticia…" }),
        ],
    content: (initialContent as never) ?? "",
    editorProps: {
      attributes: {
        class: isHeadline ? "kort-headline px-4 py-4" : "kort-prose px-4 py-4",
      },
    },
    onUpdate: ({ editor }) => {
      onChange({ json: editor.getJSON(), html: editor.getHTML() });
    },
  });

  const insertImage = useCallback(
    async (file: File) => {
      if (!editor) return;
      setError(null);
      setUploading(true);
      try {
        const url = await uploadImage(file);
        editor.chain().focus().setImage({ src: url }).run();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setUploading(false);
      }
    },
    [editor],
  );

  const setLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL del enlace (vacío para quitarlo)", previous ?? "https://");

    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return (
      <div className="rounded-[var(--radius-card)] border border-border bg-input p-4 text-sm text-muted">
        Cargando editor…
      </div>
    );
  }

  if (isHeadline) {
    return (
      <div className="rounded-[var(--radius-card)] border border-border-strong overflow-hidden">
        <HeadlineToolbar editor={editor} />
        <EditorContent editor={editor} />
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-border overflow-hidden">
      <Toolbar
        editor={editor}
        uploading={uploading}
        onPickImage={() => fileInputRef.current?.click()}
        onSetLink={setLink}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void insertImage(file);
          e.target.value = "";
        }}
      />

      {error && (
        <p className="border-b border-border bg-chip px-4 py-2 text-sm text-accent">{error}</p>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}

// ---------------------------------------------------------------------------

/** Toolbar del titular: solo lo que un titular necesita. */
function HeadlineToolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border bg-chip px-2 py-2">
      <Btn
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Negrita"
      >
        <b>B</b>
      </Btn>
      <Btn
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Cursiva"
      >
        <i>I</i>
      </Btn>

      <Sep />

      <Btn
        active={editor.isActive("highlight")}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        title="Resaltar con recuadro"
      >
        <span className="bg-foreground text-background px-1">Aa</span>
      </Btn>
      <span className="ml-1 text-xs font-semibold text-muted">
        Resalta la parte del titular que quieres en recuadro
      </span>
    </div>
  );
}

function Toolbar({
  editor,
  uploading,
  onPickImage,
  onSetLink,
}: {
  editor: Editor;
  uploading: boolean;
  onPickImage: () => void;
  onSetLink: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border bg-chip px-2 py-2">
      <Btn
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Negrita"
      >
        <b>B</b>
      </Btn>
      <Btn
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Cursiva"
      >
        <i>I</i>
      </Btn>
      <Btn
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Subrayado"
      >
        <u>U</u>
      </Btn>

      <Sep />

      {([1, 2, 3] as const).map((level) => (
        <Btn
          key={level}
          active={editor.isActive("heading", { level })}
          onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
          title={`Encabezado ${level}`}
        >
          H{level}
        </Btn>
      ))}
      <Btn
        active={editor.isActive("paragraph")}
        onClick={() => editor.chain().focus().setParagraph().run()}
        title="Párrafo normal"
      >
        ¶
      </Btn>

      <Sep />

      <Btn
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Lista con viñetas"
      >
        •—
      </Btn>
      <Btn
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Lista numerada"
      >
        1—
      </Btn>
      <Btn
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Cita"
      >
        ❞
      </Btn>

      <Sep />

      <select
        aria-label="Color de texto"
        className="rounded-[var(--radius-thumb)] border border-border bg-background px-2 py-1 text-xs font-semibold"
        value={(editor.getAttributes("textStyle").color as string) ?? ""}
        onChange={(e) => {
          const value = e.target.value;
          if (!value) editor.chain().focus().unsetColor().run();
          else editor.chain().focus().setColor(value).run();
        }}
      >
        {TEXT_COLORS.map((c) => (
          <option key={c.label} value={c.value ?? ""}>
            {c.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Resaltado"
        className="rounded-[var(--radius-thumb)] border border-border bg-background px-2 py-1 text-xs font-semibold"
        value={(editor.getAttributes("highlight").color as string) ?? ""}
        onChange={(e) => {
          const value = e.target.value;
          if (!value) editor.chain().focus().unsetHighlight().run();
          else editor.chain().focus().setHighlight({ color: value }).run();
        }}
      >
        <option value="">Sin resaltado</option>
        {HIGHLIGHTS.map((h) => (
          <option key={h.value} value={h.value}>
            {h.label}
          </option>
        ))}
      </select>

      <Sep />

      <Btn active={editor.isActive("link")} onClick={onSetLink} title="Enlace">
        🔗
      </Btn>
      <Btn onClick={onPickImage} disabled={uploading} title="Insertar imagen">
        {uploading ? "Subiendo…" : "🖼"}
      </Btn>

      <Sep />

      <Btn
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Deshacer"
      >
        ↶
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Rehacer"
      >
        ↷
      </Btn>
    </div>
  );
}

function Btn({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`min-w-8 rounded-[var(--radius-thumb)] px-2 py-1 text-sm font-semibold transition-colors disabled:opacity-40 ${
        active ? "bg-accent text-accent-foreground" : "hover:bg-border"
      }`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-border" />;
}
