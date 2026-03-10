'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, LoaderCircle } from 'lucide-react';
import {
  buildImageInsertion,
  createCardImageMarkdown,
  insertTextAtSelection,
  parseCardContent,
  removeCardContentRange,
} from '@/lib/card-content';
import { cn } from '@/lib/utils';

interface UploadedCardImage {
  alt: string;
  url: string;
}

interface CardContentInputProps
  extends Omit<
    React.HTMLAttributes<HTMLDivElement>,
    'children' | 'contentEditable' | 'dangerouslySetInnerHTML' | 'onChange'
  > {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

function extractImageFiles(dataTransfer: Pick<DataTransfer, 'files' | 'items'>) {
  const filesFromItems = Array.from(dataTransfer.items ?? [])
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);

  if (filesFromItems.length > 0) {
    return filesFromItems;
  }

  return Array.from(dataTransfer.files ?? []).filter((file) => file.type.startsWith('image/'));
}

async function uploadImages(files: File[]) {
  const formData = new FormData();

  for (const file of files) {
    formData.append('files', file);
  }

  const response = await fetch('/api/card-images', {
    method: 'POST',
    body: formData,
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error ?? 'Upload failed');
  }

  return payload.files as UploadedCardImage[];
}

function getImageMarkdown(node: Node) {
  return node instanceof HTMLElement ? node.dataset.cardImageMarkdown ?? '' : '';
}

function serializeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }

  if (node instanceof HTMLElement) {
    const markdown = getImageMarkdown(node);
    if (markdown) {
      return markdown;
    }
  }

  return Array.from(node.childNodes).map(serializeNode).join('');
}

function serializeEditorContent(editor: HTMLElement) {
  return Array.from(editor.childNodes).map(serializeNode).join('');
}

function getNodeMarkdownLength(node: Node) {
  return serializeNode(node).length;
}

function getSelectionOffsets(editor: HTMLElement) {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const hasStart = range.startContainer === editor || editor.contains(range.startContainer);
  const hasEnd = range.endContainer === editor || editor.contains(range.endContainer);

  if (!hasStart || !hasEnd) {
    return null;
  }

  const startRange = document.createRange();
  startRange.selectNodeContents(editor);
  startRange.setEnd(range.startContainer, range.startOffset);

  const endRange = document.createRange();
  endRange.selectNodeContents(editor);
  endRange.setEnd(range.endContainer, range.endOffset);

  return {
    start: serializeNode(startRange.cloneContents()).length,
    end: serializeNode(endRange.cloneContents()).length,
  };
}

function findDomPoint(parent: Node, targetOffset: number): { node: Node; offset: number } {
  let remaining = targetOffset;
  const children = Array.from(parent.childNodes);

  for (const [index, child] of children.entries()) {
    const childLength = getNodeMarkdownLength(child);

    if (remaining <= childLength) {
      if (child.nodeType === Node.TEXT_NODE) {
        return { node: child, offset: remaining };
      }

      const markdown = getImageMarkdown(child);
      if (markdown) {
        return { node: parent, offset: index + (remaining === 0 ? 0 : 1) };
      }

      return findDomPoint(child, remaining);
    }

    remaining -= childLength;
  }

  return { node: parent, offset: children.length };
}

function setSelectionOffsets(editor: HTMLElement, start: number, end: number) {
  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  const range = document.createRange();
  const startPoint = findDomPoint(editor, start);
  const endPoint = findDomPoint(editor, end);

  range.setStart(startPoint.node, startPoint.offset);
  range.setEnd(endPoint.node, endPoint.offset);

  selection.removeAllRanges();
  selection.addRange(range);
}

function renderEditorContent(
  editor: HTMLElement,
  value: string,
  onRemoveImage: (start: number, end: number) => void,
) {
  editor.replaceChildren();

  for (const part of parseCardContent(value)) {
    if (part.type === 'image' && part.value && part.start !== undefined && part.end !== undefined) {
      const wrapper = document.createElement('span');
      wrapper.contentEditable = 'false';
      wrapper.dataset.cardImageMarkdown = part.raw ?? createCardImageMarkdown(part.value, part.alt);
      wrapper.className =
        'relative my-1 inline-block max-w-full overflow-hidden rounded-md border bg-muted/30 align-top';

      const button = document.createElement('button');
      button.type = 'button';
      button.className =
        'absolute right-1 top-1 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm ring-1 ring-border transition hover:bg-background';
      button.setAttribute('aria-label', `Remove ${part.alt ?? 'image'}`);
      button.onclick = () => onRemoveImage(part.start as number, part.end as number);

      const icon = document.createElement('span');
      icon.className = 'pointer-events-none';
      icon.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
      button.appendChild(icon);

      const image = document.createElement('img');
      image.src = part.value;
      image.alt = part.alt ?? 'Card image';
      image.className = 'max-h-40 w-auto max-w-full object-contain';

      wrapper.append(button, image);
      editor.appendChild(wrapper);
      continue;
    }

    if (part.value) {
      editor.appendChild(document.createTextNode(part.value));
    }
  }
}

function insertPlainTextAtSelection(editor: HTMLElement, text: string) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return;
  }

  const range = selection.getRangeAt(0);
  const isInsideEditor = range.commonAncestorContainer === editor || editor.contains(range.commonAncestorContainer);

  if (!isInsideEditor) {
    return;
  }

  range.deleteContents();
  const textNode = document.createTextNode(text);
  range.insertNode(textNode);
  range.setStart(textNode, text.length);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

/** Rich card editor that stores markdown under the hood but renders text and images inline. */
export function CardContentInput({
  className,
  onChange,
  onPaste,
  onDrop,
  onDragOver,
  onKeyDown,
  onFocus,
  onBlur,
  value,
  placeholder,
  disabled = false,
  required: _required,
  ...props
}: CardContentInputProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const pendingSelectionRef = useRef<{ start: number; end: number; focus: boolean } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  void _required;

  function commitEditorValue() {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const nextValue = serializeEditorContent(editor);
    if (nextValue !== value) {
      onChange(nextValue);
    }
  }

  async function handleFiles(files: File[]) {
    if (files.length === 0) {
      return;
    }

    const editor = editorRef.current;
    const selection = editor ? getSelectionOffsets(editor) : null;
    const selectionStart = selection?.start ?? value.length;
    const selectionEnd = selection?.end ?? value.length;

    setIsUploading(true);
    setUploadError(null);

    try {
      const uploadedImages = await uploadImages(files);
      const markdown = uploadedImages.map((image) => createCardImageMarkdown(image.url, image.alt));
      const insertion = buildImageInsertion(value, markdown, selectionStart, selectionEnd);
      const nextState = insertTextAtSelection(value, insertion, selectionStart, selectionEnd);

      pendingSelectionRef.current = {
        start: nextState.cursor,
        end: nextState.cursor,
        focus: true,
      };
      onChange(nextState.value);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      setIsDragging(false);
    }
  }

  const handleRemoveImage = useCallback((start: number, end: number) => {
    const nextValue = removeCardContentRange(value, start, end);
    const cursor = Math.min(start, nextValue.length);

    pendingSelectionRef.current = {
      start: cursor,
      end: cursor,
      focus: true,
    };
    onChange(nextValue);
  }, [onChange, value]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    if (serializeEditorContent(editor) !== value) {
      renderEditorContent(editor, value, handleRemoveImage);
    }

    const pendingSelection = pendingSelectionRef.current;
    if (pendingSelection) {
      pendingSelectionRef.current = null;
      editor.focus();
      setSelectionOffsets(editor, pendingSelection.start, pendingSelection.end);
    }
  }, [handleRemoveImage, value]);

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'border-input bg-transparent rounded-md border shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
          isDragging && 'border-primary bg-accent/40 ring-2 ring-primary/40',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <div className="relative">
          {!value && !isFocused && placeholder ? (
            <span className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground">
              {placeholder}
            </span>
          ) : null}
          <div
            {...props}
            ref={editorRef}
            role="textbox"
            aria-multiline="true"
            contentEditable={!disabled}
            suppressContentEditableWarning
            spellCheck
            onInput={commitEditorValue}
            onFocus={(event) => {
              setIsFocused(true);
              onFocus?.(event);
            }}
            onBlur={(event) => {
              setIsFocused(false);
              onBlur?.(event);
            }}
            onKeyDown={(event) => {
              onKeyDown?.(event);
              if (event.defaultPrevented || disabled) {
                return;
              }

              if (event.key === 'Enter' && !event.metaKey && !event.ctrlKey) {
                event.preventDefault();
                insertPlainTextAtSelection(event.currentTarget, '\n');
                commitEditorValue();
              }
            }}
            onPaste={async (event) => {
              const files = extractImageFiles(event.clipboardData);

              if (files.length > 0) {
                event.preventDefault();
                await handleFiles(files);
                onPaste?.(event);
                return;
              }

              const plainText = event.clipboardData.getData('text/plain');
              if (plainText) {
                event.preventDefault();
                insertPlainTextAtSelection(event.currentTarget, plainText);
                commitEditorValue();
              }

              onPaste?.(event);
            }}
            onDragOver={(event) => {
              if (extractImageFiles(event.dataTransfer).length > 0) {
                event.preventDefault();
                setIsDragging(true);
              }

              onDragOver?.(event);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={async (event) => {
              const files = extractImageFiles(event.dataTransfer);

              if (files.length > 0) {
                event.preventDefault();
                await handleFiles(files);
                onDrop?.(event);
                return;
              }

              onDrop?.(event);
            }}
            className={cn(
              'min-h-24 whitespace-pre-wrap break-words px-3 py-2 text-sm outline-none',
              className,
            )}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          {isUploading ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ImagePlus className="h-3.5 w-3.5" />
          )}
          {isUploading ? 'Uploading image…' : 'Paste or drop an image to upload it'}
        </span>
        <span>Stores locally by default and uses Vercel Blob when configured.</span>
      </div>

      {uploadError ? <p className="text-sm text-destructive">{uploadError}</p> : null}
    </div>
  );
}
