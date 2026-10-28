"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import {
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
  useEditor,
} from "@tiptap/react";
import { Button, Tooltip } from "antd";
import {
  type ChangeEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FiCode, FiMinus } from "react-icons/fi";
import {
  MdAddPhotoAlternate,
  MdDragIndicator,
  MdFormatBold,
  MdFormatClear,
  MdFormatColorText,
  MdFormatItalic,
  MdFormatListBulleted,
  MdFormatListNumbered,
  MdFormatQuote,
  MdLooksOne,
  MdLooksTwo,
  MdOutlineTitle,
  MdRedo,
  MdStrikethroughS,
  MdUndo,
} from "react-icons/md";
import { normalizeRichTextHtml } from "@/utils/rich-text";

const MIN_RESIZABLE_IMAGE_WIDTH = 120;

const parseImageWidthAttribute = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }

  if (typeof value !== "string") return null;

  const normalized = value.trim().replace(/px$/i, "");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
};

function ResizableImageNodeView({
  editor,
  node,
  selected,
  updateAttributes,
}: NodeViewProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const isEditable = editor.isEditable;
  const persistedWidth = parseImageWidthAttribute(node.attrs.width);
  const [draftWidth, setDraftWidth] = useState<number | null>(persistedWidth);
  const [isHovered, setIsHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const getMaxWidth = useCallback(() => {
    const editorElement = wrapperRef.current?.closest(".ProseMirror");
    const editorWidth =
      editorElement instanceof HTMLElement ? editorElement.clientWidth : 0;

    return editorWidth > 0
      ? Math.max(editorWidth - 24, MIN_RESIZABLE_IMAGE_WIDTH)
      : Number.POSITIVE_INFINITY;
  }, []);

  const commitWidth = useCallback(
    (nextWidth: number) => {
      const normalizedWidth = Math.round(
        Math.max(MIN_RESIZABLE_IMAGE_WIDTH, Math.min(nextWidth, getMaxWidth())),
      );

      setDraftWidth(normalizedWidth);
      updateAttributes({ width: normalizedWidth });
    },
    [getMaxWidth, updateAttributes],
  );

  const startResize = useCallback(
    (direction: "left" | "right") =>
      (event: ReactMouseEvent<HTMLButtonElement>) => {
        if (!isEditable) return;

        event.preventDefault();
        event.stopPropagation();

        const imageElement = imageRef.current;
        if (!imageElement) return;

        const { width: renderedWidth } = imageElement.getBoundingClientRect();
        const startWidth =
          renderedWidth || persistedWidth || imageElement.width;
        if (!startWidth) return;

        const startX = event.clientX;
        const maxWidth = getMaxWidth();

        setIsResizing(true);

        const handlePointerMove = (moveEvent: MouseEvent) => {
          const deltaX = moveEvent.clientX - startX;
          const rawWidth =
            direction === "right" ? startWidth + deltaX : startWidth - deltaX;
          const nextWidth = Math.max(
            MIN_RESIZABLE_IMAGE_WIDTH,
            Math.min(rawWidth, maxWidth),
          );

          setDraftWidth(Math.round(nextWidth));
        };

        const handlePointerUp = () => {
          const finalWidth =
            imageRef.current?.getBoundingClientRect().width ||
            draftWidth ||
            startWidth;

          setIsResizing(false);
          commitWidth(finalWidth);
          window.removeEventListener("mousemove", handlePointerMove);
          window.removeEventListener("mouseup", handlePointerUp);
        };

        window.addEventListener("mousemove", handlePointerMove);
        window.addEventListener("mouseup", handlePointerUp);
      },
    [commitWidth, draftWidth, getMaxWidth, isEditable, persistedWidth],
  );

  const shouldShowControls =
    isEditable && (selected || isHovered || isResizing);
  const widthStyle =
    draftWidth && Number.isFinite(draftWidth) ? `${draftWidth}px` : undefined;

  return (
    <NodeViewWrapper
      as="div"
      className="my-3 flex justify-center"
      contentEditable={false}
    >
      <div
        ref={wrapperRef}
        className={`group/image relative inline-flex max-w-full rounded-xl transition ${
          selected
            ? "ring-2 ring-[#1677ff]/30 ring-offset-2 ring-offset-white"
            : ""
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {shouldShowControls ? (
          <div
            data-drag-handle
            draggable="true"
            className="absolute left-2 top-2 z-20 flex h-8 w-8 cursor-move items-center justify-center rounded-full border border-[#dbe3ee] bg-white/95 text-[#4b5563] shadow-sm transition hover:text-[#111827]"
            title="Drag image"
          >
            <MdDragIndicator className="text-lg" />
          </div>
        ) : null}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          src={node.attrs.src}
          alt={node.attrs.alt || ""}
          title={node.attrs.title || ""}
          data-local-id={node.attrs["data-local-id"] || undefined}
          data-key={node.attrs["data-key"] || undefined}
          width={draftWidth || undefined}
          className={`block h-auto max-w-full rounded-xl border border-[#e5e7eb] bg-white object-contain shadow-sm transition ${
            isResizing ? "select-none" : ""
          }`}
          style={{
            width: widthStyle,
            maxWidth: "100%",
          }}
          draggable={false}
        />

        {shouldShowControls ? (
          <>
            <button
              type="button"
              aria-label="Resize image from left"
              onMouseDown={startResize("left")}
              className="absolute bottom-2 left-2 z-20 h-4 w-4 cursor-ew-resize rounded-full border-2 border-white bg-[#1677ff] shadow-sm"
            />
            <button
              type="button"
              aria-label="Resize image from right"
              onMouseDown={startResize("right")}
              className="absolute bottom-2 right-2 z-20 h-4 w-4 cursor-ew-resize rounded-full border-2 border-white bg-[#1677ff] shadow-sm"
            />
          </>
        ) : null}
      </div>
    </NodeViewWrapper>
  );
}

const CustomImage = Node.create({
  name: "image",
  group: "block",
  draggable: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
        parseHTML: (element) =>
          parseImageWidthAttribute(element.getAttribute("width")),
        renderHTML: (attributes) => {
          const width = parseImageWidthAttribute(attributes.width);

          return width ? { width: String(width) } : {};
        },
      },
      "data-local-id": {
        default: null,
        parseHTML: (element) => element.getAttribute("data-local-id"),
        renderHTML: (attributes) =>
          attributes["data-local-id"]
            ? { "data-local-id": attributes["data-local-id"] }
            : {},
      },
      "data-key": {
        default: null,
        parseHTML: (element) => element.getAttribute("data-key"),
        renderHTML: (attributes) =>
          attributes["data-key"] ? { "data-key": attributes["data-key"] } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "img[src]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "img",
      mergeAttributes(HTMLAttributes, {
        class:
          "mx-auto my-3 block h-auto max-w-full rounded-lg border border-[#e5e7eb]",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageNodeView);
  },
});

export interface RichTextEditorEmbeddedImage {
  localId: string;
  file: File;
}

type RichTextEditorToolbarVariant = "basic" | "full";

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  toolbar?: RichTextEditorToolbarVariant;
  allowImages?: boolean;
  onEmbeddedImagesChange?: (images: RichTextEditorEmbeddedImage[]) => void;
}

interface ToolbarButtonProps {
  active?: boolean;
  disabled?: boolean;
  label: ReactNode;
  onClick: () => void;
  title: string;
}

function ToolbarButton({
  active = false,
  disabled = false,
  label,
  onClick,
  title,
}: ToolbarButtonProps) {
  return (
    <Tooltip title={title}>
      <Button
        type="text"
        size="small"
        disabled={disabled}
        aria-label={title}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onClick}
        className={`!inline-flex !h-8 !w-8 !items-center !justify-center !rounded-md !border !px-0 ${
          active
            ? "!border-[#1677ff] !bg-[#e6f4ff] !text-[#1677ff]"
            : "!border-transparent !text-[#4b5563] hover:!border-[#d9d9d9] hover:!bg-white hover:!text-[#111827]"
        }`}
      >
        <span className="text-base leading-none">{label}</span>
      </Button>
    </Tooltip>
  );
}

function BasicRichTextEditor({
  value,
  onChange,
  placeholder,
  disabled = false,
  hasError = false,
}: RichTextEditorProps) {
  const skipInitialUpdateRef = useRef(true);
  const editor = useEditor(
    {
      immediatelyRender: false,
      shouldRerenderOnTransaction: true,
      editable: !disabled,
      extensions: [
        StarterKit.configure({
          codeBlock: false,
          heading: false,
          horizontalRule: false,
        }),
        Placeholder.configure({
          placeholder: placeholder || "",
        }),
      ],
      content: normalizeRichTextHtml(value),
      onUpdate: ({ editor: nextEditor }) => {
        const nextValue = normalizeRichTextHtml(nextEditor.getHTML());

        if (skipInitialUpdateRef.current) {
          skipInitialUpdateRef.current = false;

          const normalizedExternalValue = normalizeRichTextHtml(value);
          if (normalizedExternalValue === nextValue) return;
        }

        onChange?.(nextValue);
      },
    },
    [placeholder],
  );

  useEffect(() => {
    if (!editor) return;

    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;

    const normalizedValue = normalizeRichTextHtml(value);
    const currentValue = normalizeRichTextHtml(editor.getHTML());

    if (normalizedValue === currentValue) return;

    editor.commands.setContent(normalizedValue, {
      emitUpdate: false,
      parseOptions: {
        preserveWhitespace: "full",
      },
    });
  }, [editor, value]);

  return (
    <div
      className={`rich-text-editor overflow-hidden rounded-lg border bg-white transition ${
        hasError
          ? "border-[#ff4d4f] shadow-[0_0_0_2px_rgba(255,77,79,0.12)]"
          : "border-[#d9d9d9] hover:border-[#4096ff] focus-within:border-[#4096ff] focus-within:shadow-[0_0_0_2px_rgba(5,145,255,0.1)]"
      } ${disabled ? "bg-[#f5f5f5]" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-[#f0f0f0] bg-[#fafafa] px-2 py-2">
        <ToolbarButton
          title="Bold"
          label={<MdFormatBold />}
          disabled={!editor || disabled}
          active={Boolean(editor?.isActive("bold"))}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          title="Italic"
          label={<MdFormatItalic />}
          disabled={!editor || disabled}
          active={Boolean(editor?.isActive("italic"))}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          title="Bullet list"
          label={<MdFormatListBulleted />}
          disabled={!editor || disabled}
          active={Boolean(editor?.isActive("bulletList"))}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          title="Numbered list"
          label={<MdFormatListNumbered />}
          disabled={!editor || disabled}
          active={Boolean(editor?.isActive("orderedList"))}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton
          title="Quote"
          label={<MdFormatQuote />}
          disabled={!editor || disabled}
          active={Boolean(editor?.isActive("blockquote"))}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        />
        <div className="mx-1 h-5 w-px bg-[#e5e7eb]" />
        <ToolbarButton
          title="Undo"
          label={<MdUndo />}
          disabled={
            !editor || disabled || !editor?.can().chain().focus().undo().run()
          }
          onClick={() => editor?.chain().focus().undo().run()}
        />
        <ToolbarButton
          title="Redo"
          label={<MdRedo />}
          disabled={
            !editor || disabled || !editor?.can().chain().focus().redo().run()
          }
          onClick={() => editor?.chain().focus().redo().run()}
        />
      </div>

      <EditorContent
        editor={editor}
        className={`rich-text-editor__content px-3 py-2 text-sm text-[#111827] ${
          disabled ? "cursor-not-allowed bg-[#f5f5f5]" : ""
        }`}
      />

      <style jsx global>{`
        .rich-text-editor__content .ProseMirror {
          min-height: 140px;
          outline: none;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .rich-text-editor__content
          .ProseMirror
          p.is-editor-empty:first-child::before {
          color: #9ca3af;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }

        .rich-text-editor__content .ProseMirror p,
        .rich-text-editor__content .ProseMirror blockquote,
        .rich-text-editor__content .ProseMirror ul,
        .rich-text-editor__content .ProseMirror ol {
          margin: 0.5rem 0;
        }

        .rich-text-editor__content .ProseMirror ul,
        .rich-text-editor__content .ProseMirror ol {
          padding-left: 1.25rem;
        }

        .rich-text-editor__content .ProseMirror blockquote {
          border-left: 3px solid #d9d9d9;
          color: #4b5563;
          padding-left: 0.75rem;
        }
      `}</style>
    </div>
  );
}

function AdvancedRichTextEditor({
  value,
  onChange,
  placeholder,
  disabled = false,
  hasError = false,
  toolbar = "basic",
  allowImages = false,
  onEmbeddedImagesChange,
}: RichTextEditorProps) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);
  const skipInitialUpdateRef = useRef(true);
  const onChangeRef = useRef(onChange);
  const disabledRef = useRef(disabled);
  const embeddedImagesRef = useRef<
    Array<RichTextEditorEmbeddedImage & { previewUrl: string }>
  >([]);
  const reconcileEmbeddedImagesWithHtmlRef = useRef<(html: string) => void>(
    () => undefined,
  );
  const [embeddedImages, setEmbeddedImages] = useState<
    Array<RichTextEditorEmbeddedImage & { previewUrl: string }>
  >([]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    embeddedImagesRef.current = embeddedImages;
  }, [embeddedImages]);

  const updateEmbeddedImages = useCallback(
    (
      updater:
        | Array<RichTextEditorEmbeddedImage & { previewUrl: string }>
        | ((
            previous: Array<
              RichTextEditorEmbeddedImage & { previewUrl: string }
            >,
          ) => Array<RichTextEditorEmbeddedImage & { previewUrl: string }>),
    ) => {
      setEmbeddedImages((previous) => {
        const next =
          typeof updater === "function" ? updater(previous) : updater;

        const nextIdSet = new Set(next.map((item) => item.localId));
        previous.forEach((item) => {
          if (!nextIdSet.has(item.localId)) {
            URL.revokeObjectURL(item.previewUrl);
          }
        });

        return next;
      });
    },
    [],
  );

  const extractLocalImageIds = useCallback((html: string) => {
    if (typeof window === "undefined") return [] as string[];

    const doc = new window.DOMParser().parseFromString(html, "text/html");
    return Array.from(doc.querySelectorAll("img[data-local-id]"))
      .map((node) => node.getAttribute("data-local-id") || "")
      .filter(Boolean);
  }, []);

  const reconcileEmbeddedImagesWithHtml = useCallback(
    (html: string) => {
      const activeIds = new Set(extractLocalImageIds(html));
      updateEmbeddedImages((previous) =>
        previous.filter((item) => activeIds.has(item.localId)),
      );
    },
    [extractLocalImageIds, updateEmbeddedImages],
  );

  useEffect(() => {
    reconcileEmbeddedImagesWithHtmlRef.current =
      reconcileEmbeddedImagesWithHtml;
  }, [reconcileEmbeddedImagesWithHtml]);

  const insertImageFiles = useCallback(
    (files: File[]) => {
      if (!files.length || disabledRef.current) return;

      const imageFiles = files.filter((file) => file.type.startsWith("image/"));
      if (!imageFiles.length) return;

      const nextImages = imageFiles.map((file) => {
        const localId = `editor-image-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`;

        return {
          localId,
          file,
          previewUrl: URL.createObjectURL(file),
        };
      });

      updateEmbeddedImages((previous) => [...previous, ...nextImages]);

      editorRef.current
        ?.chain()
        .focus()
        .insertContent(
          nextImages.flatMap((item) => [
            {
              type: "image",
              attrs: {
                src: item.previewUrl,
                alt: item.file.name,
                title: item.file.name,
                "data-local-id": item.localId,
              },
            },
            {
              type: "paragraph",
            },
          ]),
        )
        .run();
    },
    [updateEmbeddedImages],
  );

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        codeBlock: toolbar === "full" ? {} : false,
        heading: toolbar === "full" ? {} : false,
        horizontalRule: toolbar === "full" ? {} : false,
      }),
      Placeholder.configure({
        placeholder: placeholder || "",
      }),
      ...(allowImages ? [CustomImage] : []),
    ],
    [allowImages, placeholder, toolbar],
  );

  const editorProps = useMemo(
    () =>
      allowImages
        ? {
            handlePaste: (_view: unknown, event: ClipboardEvent) => {
              const files = Array.from(event.clipboardData?.files || []);
              const imageFiles = files.filter((file) =>
                file.type.startsWith("image/"),
              );

              if (!imageFiles.length) return false;

              event.preventDefault();
              insertImageFiles(imageFiles);
              return true;
            },
            handleDrop: (_view: unknown, event: DragEvent) => {
              const files = Array.from(event.dataTransfer?.files || []);
              const imageFiles = files.filter((file) =>
                file.type.startsWith("image/"),
              );

              if (!imageFiles.length) return false;

              event.preventDefault();
              insertImageFiles(imageFiles);
              return true;
            },
          }
        : undefined,
    [allowImages, insertImageFiles],
  );

  const editor = useEditor(
    {
      immediatelyRender: false,
      shouldRerenderOnTransaction: true,
      editable: !disabled,
      extensions,
      content: normalizeRichTextHtml(value),
      editorProps,
      onUpdate: ({ editor: nextEditor }) => {
        const nextValue = normalizeRichTextHtml(nextEditor.getHTML());

        if (skipInitialUpdateRef.current) {
          skipInitialUpdateRef.current = false;

          const normalizedExternalValue = normalizeRichTextHtml(value);
          if (normalizedExternalValue === nextValue) return;
        }

        onChangeRef.current?.(nextValue);
        reconcileEmbeddedImagesWithHtmlRef.current(nextValue);
      },
    },
    [allowImages, placeholder, toolbar],
  );

  useEffect(() => {
    if (!editor) return;

    editorRef.current = editor;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;

    const normalizedValue = normalizeRichTextHtml(value);
    const currentValue = normalizeRichTextHtml(editor.getHTML());

    if (normalizedValue === currentValue) return;

    editor.commands.setContent(normalizedValue, {
      emitUpdate: false,
      parseOptions: {
        preserveWhitespace: "full",
      },
    });

    let isCancelled = false;

    queueMicrotask(() => {
      if (!isCancelled) {
        reconcileEmbeddedImagesWithHtml(normalizedValue);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [editor, reconcileEmbeddedImagesWithHtml, value]);

  useEffect(() => {
    onEmbeddedImagesChange?.(
      embeddedImages.map(({ localId, file }) => ({
        localId,
        file,
      })),
    );
  }, [embeddedImages, onEmbeddedImagesChange]);

  useEffect(() => {
    return () => {
      embeddedImagesRef.current.forEach((item) => {
        URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, []);

  const triggerImagePicker = () => {
    imageInputRef.current?.click();
  };

  const handleImageInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    insertImageFiles(files);
    event.target.value = "";
  };

  return (
    <div
      className={`rich-text-editor overflow-hidden rounded-lg border bg-white transition ${
        hasError
          ? "border-[#ff4d4f] shadow-[0_0_0_2px_rgba(255,77,79,0.12)]"
          : "border-[#d9d9d9] hover:border-[#4096ff] focus-within:border-[#4096ff] focus-within:shadow-[0_0_0_2px_rgba(5,145,255,0.1)]"
      } ${disabled ? "bg-[#f5f5f5]" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-[#f0f0f0] bg-[#fafafa] px-2 py-2">
        {toolbar === "full" ? (
          <>
            <ToolbarButton
              title="Paragraph"
              label={<MdOutlineTitle />}
              disabled={!editor || disabled}
              active={Boolean(editor?.isActive("paragraph"))}
              onClick={() => editor?.chain().focus().setParagraph().run()}
            />
            <ToolbarButton
              title="Heading 1"
              label={<MdLooksOne />}
              disabled={!editor || disabled}
              active={Boolean(editor?.isActive("heading", { level: 1 }))}
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 1 }).run()
              }
            />
            <ToolbarButton
              title="Heading 2"
              label={<MdLooksTwo />}
              disabled={!editor || disabled}
              active={Boolean(editor?.isActive("heading", { level: 2 }))}
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 2 }).run()
              }
            />
            <div className="mx-1 h-5 w-px bg-[#e5e7eb]" />
          </>
        ) : null}
        <ToolbarButton
          title="Bold"
          label={<MdFormatBold />}
          disabled={!editor || disabled}
          active={Boolean(editor?.isActive("bold"))}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          title="Italic"
          label={<MdFormatItalic />}
          disabled={!editor || disabled}
          active={Boolean(editor?.isActive("italic"))}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        />
        {toolbar === "full" ? (
          <>
            <ToolbarButton
              title="Strike"
              label={<MdStrikethroughS />}
              disabled={!editor || disabled}
              active={Boolean(editor?.isActive("strike"))}
              onClick={() => editor?.chain().focus().toggleStrike().run()}
            />
            <ToolbarButton
              title="Inline code"
              label={<FiCode />}
              disabled={!editor || disabled}
              active={Boolean(editor?.isActive("code"))}
              onClick={() => editor?.chain().focus().toggleCode().run()}
            />
          </>
        ) : null}
        <ToolbarButton
          title="Bullet list"
          label={<MdFormatListBulleted />}
          disabled={!editor || disabled}
          active={Boolean(editor?.isActive("bulletList"))}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          title="Numbered list"
          label={<MdFormatListNumbered />}
          disabled={!editor || disabled}
          active={Boolean(editor?.isActive("orderedList"))}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton
          title="Quote"
          label={<MdFormatQuote />}
          disabled={!editor || disabled}
          active={Boolean(editor?.isActive("blockquote"))}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        />
        {toolbar === "full" ? (
          <>
            <ToolbarButton
              title="Code block"
              label={<MdFormatColorText />}
              disabled={!editor || disabled}
              active={Boolean(editor?.isActive("codeBlock"))}
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            />
            <ToolbarButton
              title="Divider"
              label={<FiMinus />}
              disabled={!editor || disabled}
              onClick={() => editor?.chain().focus().setHorizontalRule().run()}
            />
            <ToolbarButton
              title="Clear formatting"
              label={<MdFormatClear />}
              disabled={!editor || disabled}
              onClick={() =>
                editor?.chain().focus().unsetAllMarks().clearNodes().run()
              }
            />
            {allowImages ? (
              <ToolbarButton
                title="Insert image"
                label={<MdAddPhotoAlternate />}
                disabled={!editor || disabled}
                onClick={triggerImagePicker}
              />
            ) : null}
          </>
        ) : null}
        <div className="mx-1 h-5 w-px bg-[#e5e7eb]" />
        <ToolbarButton
          title="Undo"
          label={<MdUndo />}
          disabled={
            !editor || disabled || !editor?.can().chain().focus().undo().run()
          }
          onClick={() => editor?.chain().focus().undo().run()}
        />
        <ToolbarButton
          title="Redo"
          label={<MdRedo />}
          disabled={
            !editor || disabled || !editor?.can().chain().focus().redo().run()
          }
          onClick={() => editor?.chain().focus().redo().run()}
        />
      </div>

      {allowImages ? (
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={handleImageInputChange}
        />
      ) : null}

      <EditorContent
        editor={editor}
        className={`rich-text-editor__content px-3 py-2 text-sm text-[#111827] ${
          disabled ? "cursor-not-allowed bg-[#f5f5f5]" : ""
        }`}
      />

      <style jsx global>{`
        .rich-text-editor__content .ProseMirror {
          min-height: ${toolbar === "full" ? "240px" : "140px"};
          outline: none;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .rich-text-editor__content
          .ProseMirror
          p.is-editor-empty:first-child::before {
          color: #9ca3af;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }

        .rich-text-editor__content .ProseMirror p,
        .rich-text-editor__content .ProseMirror blockquote,
        .rich-text-editor__content .ProseMirror ul,
        .rich-text-editor__content .ProseMirror ol {
          margin: 0.5rem 0;
        }

        .rich-text-editor__content .ProseMirror ul,
        .rich-text-editor__content .ProseMirror ol {
          padding-left: 1.25rem;
        }

        .rich-text-editor__content .ProseMirror blockquote {
          border-left: 3px solid #d9d9d9;
          color: #4b5563;
          padding-left: 0.75rem;
        }

        .rich-text-editor__content .ProseMirror h1,
        .rich-text-editor__content .ProseMirror h2 {
          font-weight: 700;
          line-height: 1.3;
          margin: 0.75rem 0 0.5rem;
        }

        .rich-text-editor__content .ProseMirror h1 {
          font-size: 1.5rem;
        }

        .rich-text-editor__content .ProseMirror h2 {
          font-size: 1.25rem;
        }

        .rich-text-editor__content .ProseMirror pre {
          background: #111827;
          border-radius: 0.75rem;
          color: #f9fafb;
          margin: 0.75rem 0;
          overflow-x: auto;
          padding: 0.875rem 1rem;
        }

        .rich-text-editor__content .ProseMirror code {
          background: #f3f4f6;
          border-radius: 0.375rem;
          color: #111827;
          padding: 0.125rem 0.375rem;
        }

        .rich-text-editor__content .ProseMirror pre code {
          background: transparent;
          color: inherit;
          padding: 0;
        }

        .rich-text-editor__content .ProseMirror hr {
          border: 0;
          border-top: 1px solid #e5e7eb;
          margin: 1rem 0;
        }
      `}</style>
    </div>
  );
}

export default function RichTextEditor(props: RichTextEditorProps) {
  const { toolbar = "basic", allowImages = false } = props;

  if (toolbar === "basic" && !allowImages) {
    return <BasicRichTextEditor {...props} />;
  }

  return <AdvancedRichTextEditor {...props} />;
}
