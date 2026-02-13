import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#3B82F6',
    primaryTextColor: '#F3F4F6',
    primaryBorderColor: '#6B7280',
    lineColor: '#9CA3AF',
    secondaryColor: '#1F2937',
    tertiaryColor: '#374151',
    background: '#111827',
    mainBkg: '#1F2937',
    nodeBorder: '#6B7280',
    clusterBkg: '#1F2937',
    clusterBorder: '#6B7280',
    titleColor: '#F3F4F6',
    edgeLabelBackground: '#1F2937',
  },
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis',
  },
  sequence: {
    useMaxWidth: true,
    diagramMarginX: 50,
    diagramMarginY: 10,
    actorMargin: 50,
    width: 150,
    height: 65,
  },
});

function generateId() {
  return `mermaid-${Math.random().toString(36).substr(2, 9)}`;
}

export default function MermaidRenderer({ code, className = '' }) {
  const containerRef = useRef(null);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // Track which code we've already rendered to prevent re-renders
  const renderedCodeRef = useRef(null);

  useEffect(() => {
    // Skip if code hasn't changed or is empty
    if (!code || code === renderedCodeRef.current) {
      return;
    }

    let isCancelled = false;

    const renderDiagram = async () => {
      setIsLoading(true);
      setError(null);

      try {
        await mermaid.parse(code);
        const id = generateId();
        const { svg: renderedSvg } = await mermaid.render(id, code);

        if (!isCancelled) {
          setSvg(renderedSvg);
          renderedCodeRef.current = code;
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err.message || 'Failed to render diagram');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    renderDiagram();

    return () => {
      isCancelled = true;
    };
  }, [code]);

  if (isLoading) {
    return (
      <div className={`mermaid-status mermaid-status--loading ${className}`}>
        <div className="mermaid-status__text">Rendering diagram...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`mermaid-status mermaid-status--error ${className}`}>
        <p className="mermaid-status__title">Failed to render diagram</p>
        <p className="mermaid-status__message">{error}</p>
        <details className="mermaid-status__details">
          <summary>Show source code</summary>
          <pre>{code}</pre>
        </details>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`mermaid-container ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
