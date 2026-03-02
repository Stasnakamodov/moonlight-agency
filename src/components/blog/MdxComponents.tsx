import type { MDXComponents } from "mdx/types";

export const mdxComponents: MDXComponents = {
  h1: (props) => <h1 className="text-3xl font-bold text-white mt-8 mb-4" {...props} />,
  h2: (props) => <h2 className="text-2xl font-bold text-white mt-8 mb-3" {...props} />,
  h3: (props) => <h3 className="text-xl font-semibold text-white mt-6 mb-2" {...props} />,
  p: (props) => <p className="text-slate-300 leading-relaxed mb-4" {...props} />,
  ul: (props) => <ul className="list-disc list-inside text-slate-300 mb-4 space-y-1" {...props} />,
  ol: (props) => <ol className="list-decimal list-inside text-slate-300 mb-4 space-y-1" {...props} />,
  li: (props) => <li className="text-slate-300" {...props} />,
  a: (props) => <a className="text-sky-400 hover:text-sky-300 underline underline-offset-2 transition-colors" {...props} />,
  code: (props) => <code className="bg-white/10 text-sky-300 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />,
  pre: (props) => <pre className="bg-white/5 border border-white/10 rounded-xl p-4 overflow-x-auto mb-4 text-sm" {...props} />,
  blockquote: (props) => <blockquote className="border-l-2 border-sky-500/50 pl-4 italic text-slate-400 mb-4" {...props} />,
  hr: () => <hr className="border-white/10 my-8" />,
  img: (props) => <img className="rounded-xl border border-white/10 my-6" {...props} />,
  table: (props) => <div className="overflow-x-auto mb-4"><table className="w-full text-sm text-slate-300" {...props} /></div>,
  th: (props) => <th className="border border-white/10 px-3 py-2 text-left font-medium text-white" {...props} />,
  td: (props) => <td className="border border-white/10 px-3 py-2" {...props} />,
};
