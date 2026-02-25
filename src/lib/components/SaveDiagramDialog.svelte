<script lang="ts">
  import { Button } from '$/components/ui/button';
  import * as Dialog from '$/components/ui/dialog';
  import { Input } from '$/components/ui/input';
  import { notify } from '$lib/util/notify';
  import { addDiagram, addGroup, groupsStore, loadGroups } from '$lib/util/diagramStore';
  import { inputStateStore } from '$lib/util/state';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import SaveIcon from '~icons/material-symbols/save-outline-rounded';
  import PlusIcon from '~icons/material-symbols/add-rounded';

  let open = $state(false);
  let diagramName = $state('');
  let selectedGroupId = $state<string | null>(null);
  let newGroupName = $state('');
  let showNewGroup = $state(false);

  onMount(() => {
    void loadGroups();
  });

  async function handleSave() {
    if (!diagramName.trim()) {
      notify('请输入图表名称');
      return;
    }

    let groupId = selectedGroupId;

    if (showNewGroup && newGroupName.trim()) {
      const group = await addGroup(newGroupName.trim());
      groupId = group.id;
    }

    const state = get(inputStateStore);
    await addDiagram(diagramName.trim(), state.code, state.mermaid, groupId);
    notify('图表已保存');
    open = false;
    diagramName = '';
    selectedGroupId = null;
    newGroupName = '';
    showNewGroup = false;
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Trigger>
    {#snippet child({ props })}
      <Button variant="ghost" size="sm" {...props} title="保存到图表库">
        <SaveIcon />
        <span class="hidden lg:inline">保存</span>
      </Button>
    {/snippet}
  </Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>保存图表</Dialog.Title>
      <Dialog.Description>将当前图表保存到本地图表库，方便以后查看和编辑。</Dialog.Description>
    </Dialog.Header>

    <div class="flex flex-col gap-4 py-4">
      <div class="flex flex-col gap-2">
        <label for="diagram-name" class="text-sm font-medium">图表名称</label>
        <Input id="diagram-name" bind:value={diagramName} placeholder="输入图表名称..." />
      </div>

      <div class="flex flex-col gap-2">
        <label for="diagram-group" class="text-sm font-medium">分组</label>
        {#if !showNewGroup}
          <div class="flex gap-2">
            <select
              id="diagram-group"
              class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
              bind:value={selectedGroupId}>
              <option value={null}>未分组</option>
              {#each $groupsStore as group (group.id)}
                <option value={group.id}>{group.name}</option>
              {/each}
            </select>
            <Button
              variant="outline"
              size="icon"
              class="shrink-0"
              onclick={() => (showNewGroup = true)}
              title="新建分组">
              <PlusIcon />
            </Button>
          </div>
        {:else}
          <div class="flex gap-2">
            <Input bind:value={newGroupName} placeholder="输入新分组名称..." />
            <Button
              variant="outline"
              size="sm"
              onclick={() => {
                showNewGroup = false;
                newGroupName = '';
              }}>
              取消
            </Button>
          </div>
        {/if}
      </div>
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => (open = false)}>取消</Button>
      <Button variant="accent" onclick={handleSave}>保存</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
