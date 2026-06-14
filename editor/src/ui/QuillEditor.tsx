import { useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

interface QuillEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function QuillEditor({ value, onChange, placeholder }: QuillEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current || quillRef.current) return;

    const editor = new Quill(containerRef.current, {
      theme: 'snow',
      placeholder: placeholder || 'Écris ton contenu…',
      modules: {
        toolbar: [
          [{ header: [2, 3, false] }],
          ['bold', 'italic', 'underline'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link'],
          ['clean'],
        ],
      },
    });

    if (value) editor.clipboard.dangerouslyPasteHTML(value);

    editor.on('text-change', () => {
      const html = editor.root.innerHTML;
      onChangeRef.current(html === '<p><br></p>' ? '' : html);
    });

    quillRef.current = editor;

    return () => {
      // Quill doesn't expose a clean destroy; we just remove the toolbar + editor.
      const root = containerRef.current;
      if (root) root.innerHTML = '';
      const toolbar = root?.previousElementSibling;
      if (toolbar?.classList.contains('ql-toolbar')) toolbar.remove();
      quillRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="quill-host" />;
}
