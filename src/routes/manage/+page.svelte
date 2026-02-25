<script lang="ts">
  import { Button } from '$/components/ui/button';
  import * as Dialog from '$/components/ui/dialog';
  import { Input } from '$/components/ui/input';
  import { Separator } from '$/components/ui/separator';
  import type { DiagramGroup, SavedDiagram } from '$lib/types';
  import {
    addGroup,
    diagramsStore,
    editDiagram,
    editGroup,
    groupsStore,
    loadAll,
    removeDiagram,
    removeGroup
  } from '$lib/util/diagramStore';
  import { notify } from '$lib/util/notify';
  import { inputStateStore } from '$lib/util/state';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import dayjs from 'dayjs';
  import dayjsRelativeTime from 'dayjs/plugin/relativeTime';
  import { onMount } from 'svelte';

  import ArrowBackIcon from '~icons/material-symbols/arrow-back-rounded';
  import DeleteIcon from '~icons/material-symbols/delete-outline-rounded';
  import EditIcon from '~icons/material-symbols/edit-outline-rounded';
  import FolderIcon from '~icons/material-symbols/folder-outline-rounded';
  import FolderOpenIcon from '~icons/material-symbols/folder-open-outline-rounded';
  import OpenIcon from '~icons/material-symbols/open-in-new-rounded';
  import PlusIcon from '~icons/material-symbols/add-rounded';
  import AllIcon from '~icons/material-symbols/grid-view-outline-rounded';
  import MoveIcon from '~icons/material-symbols/drive-file-move-outline-rounded';

  dayjs.extend(dayjsRelativeTime);

  // State
  let selectedGroupId = $state<string | null | 'all'>('all');
  let searchQuery = $state('');

  // Group dialog
  let groupDialogOpen = $state(false);
  let groupDialogMode = $state<'create' | 'edit'>('create');
  let groupDialogName = $state('');
  let groupDialogId = $state('');

  // Move dialog
  let moveDialogOpen = $state(false);
  let moveDiagramId = $state('');
  let moveTargetGroupId = $state<string | null>(null);

  // Rename diagram dialog
  let renameDialogOpen = $state(false);
  let renameDiagramId = $state('');
  let renameDiagramName = $state('');

  let filteredDiagrams = $derived.by(() => {
    let diagrams = $diagramsStore;

    // Filter by group
    if (selectedGroupId !== 'all') {
      diagrams = diagrams.filter((d) =>
        selectedGroupId === null ? !d.groupId : d.groupId === selectedGroupId
      );
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      diagrams = diagrams.filter(
        (d) => d.name.toLowerCase().includes(query) || d.code.toLowerCase().includes(query)
      );
    }

    return diagrams;
  });

  function getGroupName(groupId: string | null): string {
    if (!groupId) return '未分组';
    const group = $groupsStore.find((g) => g.id === groupId);
    return group?.name ?? '未知分组';
  }

  function getDiagramCountForGroup(groupId: string | null | 'all'): number {
    if (groupId === 'all') return $diagramsStore.length;
    return $diagramsStore.filter((d) => (groupId === null ? !d.groupId : d.groupId === groupId))
      .length;
  }

  function openInEditor(diagram: SavedDiagram) {
    inputStateStore.set({
      code: diagram.code,
      grid: true,
      mermaid: diagram.mermaid,
      panZoom: true,
      rough: false,
      updateDiagram: true
    });
    void goto(`${base}/edit`);
  }

  function handleDeleteDiagram(id: string, name: string) {
    if (confirm(`确定要删除图表 "${name}" 吗？`)) {
      void removeDiagram(id);
      notify('图表已删除');
    }
  }

  function openGroupDialog(mode: 'create' | 'edit', group?: DiagramGroup) {
    groupDialogMode = mode;
    if (mode === 'edit' && group) {
      groupDialogId = group.id;
      groupDialogName = group.name;
    } else {
      groupDialogId = '';
      groupDialogName = '';
    }
    groupDialogOpen = true;
  }

  async function handleGroupDialogSave() {
    if (!groupDialogName.trim()) {
      notify('请输入分组名称');
      return;
    }
    if (groupDialogMode === 'create') {
      await addGroup(groupDialogName.trim());
      notify('分组已创建');
    } else {
      await editGroup(groupDialogId, groupDialogName.trim());
      notify('分组已更新');
    }
    groupDialogOpen = false;
  }

  function handleDeleteGroup(group: DiagramGroup) {
    const count = getDiagramCountForGroup(group.id);
    const message =
      count > 0
        ? `分组 "${group.name}" 中有 ${count} 个图表，删除后图表将移至未分组。确定要删除吗？`
        : `确定要删除分组 "${group.name}" 吗？`;
    if (confirm(message)) {
      if (selectedGroupId === group.id) {
        selectedGroupId = 'all';
      }
      void removeGroup(group.id);
      notify('分组已删除');
    }
  }

  function openMoveDialog(diagram: SavedDiagram) {
    moveDiagramId = diagram.id;
    moveTargetGroupId = diagram.groupId;
    moveDialogOpen = true;
  }

  async function handleMove() {
    await editDiagram(moveDiagramId, { groupId: moveTargetGroupId });
    moveDialogOpen = false;
    notify('图表已移动');
  }

  function openRenameDialog(diagram: SavedDiagram) {
    renameDiagramId = diagram.id;
    renameDiagramName = diagram.name;
    renameDialogOpen = true;
  }

  async function handleRename() {
    if (!renameDiagramName.trim()) {
      notify('请输入图表名称');
      return;
    }
    await editDiagram(renameDiagramId, { name: renameDiagramName.trim() });
    renameDialogOpen = false;
    notify('图表已重命名');
  }

  function getCodePreview(code: string): string {
    const lines = code.split('\n');
    return lines.slice(0, 3).join('\n');
  }

  onMount(() => {
    void loadAll();
  });
</script>

<div class="flex h-full flex-col overflow-hidden">
  <!-- Top nav -->
  <nav class="z-50 flex items-center gap-3 p-4 sm:p-6">
    <Button variant="ghost" size="icon" href="{base}/edit" title="返回编辑器">
      <ArrowBackIcon />
    </Button>
    <h1 class="text-xl font-semibold text-foreground">图表管理</h1>
    <div class="flex-1"></div>
    <Input class="max-w-xs" placeholder="搜索图表..." bind:value={searchQuery} />
  </nav>

  <Separator />

  <div class="flex flex-1 overflow-hidden">
    <!-- Sidebar: Groups -->
    <aside class="flex w-56 shrink-0 flex-col border-r border-border bg-muted/30">
      <div class="flex items-center justify-between p-3">
        <span class="text-sm font-medium text-muted-foreground">分组</span>
        <Button
          variant="ghost"
          size="icon"
          onclick={() => openGroupDialog('create')}
          title="新建分组">
          <PlusIcon />
        </Button>
      </div>
      <Separator />
      <ul class="flex-1 overflow-auto p-2">
        <!-- All -->
        <li>
          <button
            class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-primary/10 {selectedGroupId ===
            'all'
              ? 'bg-primary text-primary-foreground'
              : ''}"
            onclick={() => (selectedGroupId = 'all')}>
            <AllIcon class="size-4 shrink-0" />
            <span class="flex-1 truncate text-left">全部</span>
            <span class="text-xs opacity-60">{getDiagramCountForGroup('all')}</span>
          </button>
        </li>
        <!-- Ungrouped -->
        <li>
          <button
            class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-primary/10 {selectedGroupId ===
            null
              ? 'bg-primary text-primary-foreground'
              : ''}"
            onclick={() => (selectedGroupId = null)}>
            <FolderIcon class="size-4 shrink-0" />
            <span class="flex-1 truncate text-left">未分组</span>
            <span class="text-xs opacity-60">{getDiagramCountForGroup(null)}</span>
          </button>
        </li>
        <Separator class="my-1" />
        <!-- Groups -->
        {#each $groupsStore as group (group.id)}
          <li class="group/item">
            <div
              class="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-primary/10 {selectedGroupId ===
              group.id
                ? 'bg-primary text-primary-foreground'
                : ''}"
              role="button"
              tabindex="0"
              onclick={() => (selectedGroupId = group.id)}
              onkeydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  selectedGroupId = group.id;
                }
              }}>
              {#if selectedGroupId === group.id}
                <FolderOpenIcon class="size-4 shrink-0" />
              {:else}
                <FolderIcon class="size-4 shrink-0" />
              {/if}
              <span class="flex-1 truncate text-left">{group.name}</span>
              <span class="text-xs opacity-60">{getDiagramCountForGroup(group.id)}</span>
              <span class="hidden items-center gap-0.5 group-hover/item:flex" role="toolbar">
                <button
                  class="rounded p-0.5 hover:bg-primary/20"
                  onclick={(e) => {
                    e.stopPropagation();
                    openGroupDialog('edit', group);
                  }}
                  title="编辑分组">
                  <EditIcon class="size-3.5" />
                </button>
                <button
                  class="rounded p-0.5 hover:bg-destructive/20 hover:text-destructive"
                  onclick={(e) => {
                    e.stopPropagation();
                    handleDeleteGroup(group);
                  }}
                  title="删除分组">
                  <DeleteIcon class="size-3.5" />
                </button>
              </span>
            </div>
          </li>
        {/each}
      </ul>
    </aside>

    <!-- Main: Diagram cards -->
    <main class="flex-1 overflow-auto p-4 sm:p-6">
      {#if filteredDiagrams.length === 0}
        <div class="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
          <FolderOpenIcon class="size-16 opacity-30" />
          <p class="text-lg">
            {#if searchQuery.trim()}
              没有找到匹配的图表
            {:else}
              暂无图表
            {/if}
          </p>
          <p class="text-sm">在编辑器中创建图表后，点击保存按钮即可添加到图表库。</p>
        </div>
      {:else}
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {#each filteredDiagrams as diagram (diagram.id)}
            <div
              class="group flex flex-col rounded-lg border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
              <!-- Title row -->
              <div class="mb-2 flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <h3 class="truncate text-sm font-medium" title={diagram.name}>
                    {diagram.name}
                  </h3>
                  <div class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span class="rounded bg-muted px-1.5 py-0.5"
                      >{getGroupName(diagram.groupId)}</span>
                    <span>{dayjs(diagram.updatedAt).fromNow()}</span>
                  </div>
                </div>
              </div>

              <!-- Code preview -->
              <div
                class="mb-3 flex-1 rounded bg-muted/50 p-2 font-mono text-xs leading-relaxed text-muted-foreground">
                <pre class="line-clamp-3 whitespace-pre-wrap">{getCodePreview(diagram.code)}</pre>
              </div>

              <!-- Actions -->
              <div class="flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onclick={() => openInEditor(diagram)}
                  title="在编辑器中打开">
                  <OpenIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onclick={() => openRenameDialog(diagram)}
                  title="重命名">
                  <EditIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onclick={() => openMoveDialog(diagram)}
                  title="移动到分组">
                  <MoveIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  class="hover:text-destructive"
                  onclick={() => handleDeleteDiagram(diagram.id, diagram.name)}
                  title="删除">
                  <DeleteIcon />
                </Button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </main>
  </div>
</div>

<!-- Group Create/Edit Dialog -->
<Dialog.Root bind:open={groupDialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>{groupDialogMode === 'create' ? '新建分组' : '编辑分组'}</Dialog.Title>
      <Dialog.Description>
        {groupDialogMode === 'create' ? '创建一个新的分组来组织你的图表。' : '修改分组名称。'}
      </Dialog.Description>
    </Dialog.Header>
    <div class="py-4">
      <Input bind:value={groupDialogName} placeholder="分组名称..." />
    </div>
    <Dialog.Footer>
      <Button variant="outline" onclick={() => (groupDialogOpen = false)}>取消</Button>
      <Button variant="accent" onclick={handleGroupDialogSave}>
        {groupDialogMode === 'create' ? '创建' : '保存'}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Move Diagram Dialog -->
<Dialog.Root bind:open={moveDialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>移动图表</Dialog.Title>
      <Dialog.Description>选择目标分组。</Dialog.Description>
    </Dialog.Header>
    <div class="py-4">
      <select
        class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
        bind:value={moveTargetGroupId}>
        <option value={null}>未分组</option>
        {#each $groupsStore as group (group.id)}
          <option value={group.id}>{group.name}</option>
        {/each}
      </select>
    </div>
    <Dialog.Footer>
      <Button variant="outline" onclick={() => (moveDialogOpen = false)}>取消</Button>
      <Button variant="accent" onclick={handleMove}>移动</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Rename Diagram Dialog -->
<Dialog.Root bind:open={renameDialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>重命名图表</Dialog.Title>
      <Dialog.Description>修改图表名称。</Dialog.Description>
    </Dialog.Header>
    <div class="py-4">
      <Input bind:value={renameDiagramName} placeholder="图表名称..." />
    </div>
    <Dialog.Footer>
      <Button variant="outline" onclick={() => (renameDialogOpen = false)}>取消</Button>
      <Button variant="accent" onclick={handleRename}>保存</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
