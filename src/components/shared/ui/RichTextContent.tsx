"use client";

import DOMPurify from "dompurify";
import { useMemo } from "react";
import {
  hasMeaningfulRichTextContent,
  normalizeRichTextHtml,
} from "@/utils/rich-text";

interface RichTextContentProps {
  value?: string | null;
  className?: string;
  emptyFallback?: string;
}

export default function RichTextContent({
  value,
  className,
  emptyFallback,
}: RichTextContentProps) {
  const normalizedValue = useMemo(() => normalizeRichTextHtml(value), [value]);
  const hasContent = useMemo(
    () => hasMeaningfulRichTextContent(normalizedValue),
    [normalizedValue],
  );

  const sanitizedHtml = useMemo(() => {
    if (!normalizedValue) return "";

    return DOMPurify.sanitize(normalizedValue, {
      ALLOWED_ATTR: [
        "alt",
        "class",
        "data-key",
        "href",
        "rel",
        "src",
        "target",
        "title",
        "width",
      ],
      ALLOWED_TAGS: [
        "blockquote",
        "br",
        "code",
        "em",
        "h1",
        "h2",
        "hr",
        "img",
        "li",
        "ol",
        "p",
        "pre",
        "strong",
        "ul",
      ],
    });
  }, [normalizedValue]);

  if (!hasContent) {
    return emptyFallback ? <p className={className}>{emptyFallback}</p> : null;
  }

  return (
    <>
      <div
        className={`rich-text-content ${className || ""}`.trim()}
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />

      <style jsx global>{`
        .rich-text-content p,
        .rich-text-content blockquote,
        .rich-text-content ul,
        .rich-text-content ol,
        .rich-text-content pre,
        .rich-text-content hr {
          margin: 0.5rem 0;
        }

        .rich-text-content p:first-child,
        .rich-text-content blockquote:first-child,
        .rich-text-content ul:first-child,
        .rich-text-content ol:first-child,
        .rich-text-content pre:first-child,
        .rich-text-content hr:first-child {
          margin-top: 0;
        }

        .rich-text-content p:last-child,
        .rich-text-content blockquote:last-child,
        .rich-text-content ul:last-child,
        .rich-text-content ol:last-child,
        .rich-text-content pre:last-child,
        .rich-text-content hr:last-child {
          margin-bottom: 0;
        }

        .rich-text-content ul,
        .rich-text-content ol {
          padding-left: 1.25rem;
        }

        .rich-text-content blockquote {
          border-left: 3px solid #d1d5db;
          color: #4b5563;
          padding-left: 0.75rem;
        }

        .rich-text-content h1,
        .rich-text-content h2 {
          font-weight: 700;
          line-height: 1.3;
          margin: 0.75rem 0 0.5rem;
        }

        .rich-text-content h1 {
          font-size: 1.5rem;
        }

        .rich-text-content h2 {
          font-size: 1.25rem;
        }

        .rich-text-content img {
          display: block;
          max-width: 100%;
          height: auto;
          margin: 0.75rem auto;
        }

        .rich-text-content pre {
          background: #111827;
          border-radius: 0.75rem;
          color: #f9fafb;
          overflow-x: auto;
          padding: 0.875rem 1rem;
        }

        .rich-text-content code {
          background: #f3f4f6;
          border-radius: 0.375rem;
          color: #111827;
          padding: 0.125rem 0.375rem;
        }

        .rich-text-content pre code {
          background: transparent;
          color: inherit;
          padding: 0;
        }

        .rich-text-content hr {
          border: 0;
          border-top: 1px solid #e5e7eb;
        }
      `}</style>
    </>
  );
}
