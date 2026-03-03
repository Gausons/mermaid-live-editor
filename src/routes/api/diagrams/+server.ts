import { createDiagram, getAllDiagrams } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/diagrams - List all diagrams
export const GET: RequestHandler = () => {
  const diagrams = getAllDiagrams();
  return json(diagrams);
};

// POST /api/diagrams - Create a diagram
export const POST: RequestHandler = async ({ request }) => {
  const { name, code, mermaid, group_id } = (await request.json()) as {
    code: string;
    group_id: string | null;
    mermaid: string;
    name: string;
  };
  if (!name?.trim()) {
    return json({ error: '图表名称不能为空' }, { status: 400 });
  }
  if (!code) {
    return json({ error: '图表代码不能为空' }, { status: 400 });
  }
  const diagram = createDiagram(name.trim(), code, mermaid || '{}', group_id ?? null);
  return json(diagram, { status: 201 });
};
