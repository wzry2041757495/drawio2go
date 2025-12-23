/**
 * Markdown 渲染组件配置
 */

import { type Components as MarkdownComponents } from "react-markdown";

export const markdownComponents: MarkdownComponents = {
  a({ node: _node, ...props }) {
    return (
      <a
        {...props}
        className="message-link"
        target="_blank"
        rel="noopener noreferrer"
      />
    );
  },
  code({ node: _node, className, children, ...props }) {
    const content = String(children).replace(/\n$/, "");
    const isInline = !className?.includes("language-");

    if (isInline) {
      return (
        <code className={`inline-code ${className ?? ""}`.trim()} {...props}>
          {content}
        </code>
      );
    }

    return (
      <pre className={`code-block ${className ?? ""}`.trim()}>
        <code>{content}</code>
      </pre>
    );
  },
  blockquote({ node: _node, ...props }) {
    return <blockquote className="message-quote" {...props} />;
  },
  ul({ node: _node, ...props }) {
    return <ul className="message-list" {...props} />;
  },
  ol({ node: _node, ...props }) {
    return <ol className="message-list message-list-ordered" {...props} />;
  },
  table({ node: _node, ...props }) {
    // eslint-disable-next-line sonarjs/table-header
    const table = <table className="message-table" {...props} />;
    return <div className="message-table-wrapper">{table}</div>;
  },
  thead({ node: _node, ...props }) {
    return <thead className="message-table-head" {...props} />;
  },
  tbody({ node: _node, ...props }) {
    return <tbody className="message-table-body" {...props} />;
  },
  tr({ node: _node, ...props }) {
    return <tr className="message-table-row" {...props} />;
  },
  th({ node: _node, ...props }) {
    return <th className="message-table-header-cell" {...props} />;
  },
  td({ node: _node, ...props }) {
    return <td className="message-table-data-cell" {...props} />;
  },
};
