import { deleteDiagram, getDiagram, updateDiagramRecord } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/diagrams/:id - Get a single diagram
export const GET: RequestHandler = ({ params }) => {
  const diagram = getDiagram(params.id);
  if (!diagram) {
    return json({ error: '图表不存在' }, { status: 404 });
  }
  return json(diagram);
};

// PUT /api/diagrams/:id - Update a diagram
export const PUT: RequestHandler = async ({ params, request }) => {
  const updates = (await request.json()) as {
    code?: string;
    group_id?: string | null;
    mermaid?: string;
    name?: string;
  };
  const existing = getDiagram(params.id);
  if (!existing) {
    return json({ error: '图表不存在' }, { status: 404 });
  }
  updateDiagramRecord(params.id, updates);
  const updated = getDiagram(params.id);
  return json(updated);
};

// DELETE /api/diagrams/:id - Delete a diagram
export const DELETE: RequestHandler = ({ params }) => {
  const existing = getDiagram(params.id);
  if (!existing) {
    return json({ error: '图表不存在' }, { status: 404 });
  }
  deleteDiagram(params.id);
  return json({ success: true });
};
