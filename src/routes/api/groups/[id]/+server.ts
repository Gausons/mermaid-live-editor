import { deleteGroup, getGroup, updateGroup } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// PUT /api/groups/:id - Update a group
export const PUT: RequestHandler = async ({ params, request }) => {
  const { name } = (await request.json()) as { name: string };
  if (!name?.trim()) {
    return json({ error: '分组名称不能为空' }, { status: 400 });
  }
  const existing = getGroup(params.id);
  if (!existing) {
    return json({ error: '分组不存在' }, { status: 404 });
  }
  updateGroup(params.id, name.trim());
  return json({ ...existing, name: name.trim(), updated_at: Date.now() });
};

// DELETE /api/groups/:id - Delete a group
export const DELETE: RequestHandler = ({ params }) => {
  const existing = getGroup(params.id);
  if (!existing) {
    return json({ error: '分组不存在' }, { status: 404 });
  }
  deleteGroup(params.id);
  return json({ success: true });
};
