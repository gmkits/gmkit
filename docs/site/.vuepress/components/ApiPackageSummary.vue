<script setup lang="ts">
import { onMounted, ref } from 'vue';

const props = defineProps<{
  packageId?: 'typescript' | 'java';
}>();

interface ApiSummary {
  typescriptRootExports?: number;
  javaPublicTypes?: number;
}

interface PackageEntry {
  id: string;
  apiSummary?: ApiSummary;
}

const packages = ref<PackageEntry[]>([]);
const error = ref('');

onMounted(async () => {
  try {
    const response = await fetch('/api/manifest.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const manifest = await response.json() as { packages?: PackageEntry[] };
    packages.value = manifest.packages ?? [];
  } catch (cause) {
    error.value = `暂时无法读取 API 统计：${cause instanceof Error ? cause.message : String(cause)}`;
  }
});

function summary(entry: PackageEntry) {
  if (entry.id === 'typescript' && entry.apiSummary?.typescriptRootExports) {
    return `${entry.apiSummary.typescriptRootExports} 个根导出`;
  }
  if (entry.id === 'java' && entry.apiSummary?.javaPublicTypes) {
    return `${entry.apiSummary.javaPublicTypes} 个公共顶层类型`;
  }
  return '统计生成中';
}
</script>

<template>
  <span class="api-package-summary" aria-live="polite">
    <span
      v-for="entry in packages.filter((item) => !props.packageId || item.id === props.packageId)"
      :key="entry.id"
      class="api-package-summary__item"
    >
      {{ entry.id === 'typescript' ? 'TypeScript' : 'Java' }}：{{ summary(entry) }}
    </span>
    <span v-if="error" class="api-package-summary__error">{{ error }}</span>
  </span>
</template>

<style scoped>
.api-package-summary {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.75rem;
}

.api-package-summary__item {
  color: var(--vp-c-text-mute);
  font-size: 0.78rem;
}

.api-package-summary__error {
  color: var(--vp-c-danger);
  font-size: 0.78rem;
}
</style>
