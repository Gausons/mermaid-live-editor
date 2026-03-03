import { createGroup, getAllGroups } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/groups - List all groups
export const GET: RequestHandler = () => {
  const groups = getAllGroups();
  return json(groups);
};

// POST /api/groups - Create a group
export const POST: RequestHandler = async ({ request }) => {
  const { name } = (await request.json()) as { name: string };
  if (!name?.trim()) {
    return json({ error: '分组名称不能为空' }, { status: 400 });
  }
  const group = createGroup(name.trim());
  return json(group, { status: 201 });
};
