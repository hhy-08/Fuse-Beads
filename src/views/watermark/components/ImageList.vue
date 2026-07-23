<template>
  <div v-if="imageList.length" class="image-list-container">
    <div
      v-for="(img, index) in imageList"
      :key="`${img.file.name}-${index}`"
      class="image-item"
      :class="{ active: currentIndex === index }"
      @click="EmitSelect(index)"
    >
      <img :src="img.url" class="thumbnail" :alt="img.file.name" />
      <div class="image-info">
        <span class="image-name">{{ img.displayName || img.file.name }}</span>
        <span class="process-status" :class="img.status">
          {{ ResolveStatusText(img.status) }}
        </span>
      </div>
      <button type="button" class="remove-btn" @click.stop="EmitRemove(index)">
        ×
      </button>
    </div>
  </div>
</template>

<script lang="ts">
/**
 * 水印工具图片列表组件
 * 展示缩略图、处理状态，支持选择与删除
 */
import { defineComponent, type PropType } from 'vue'
import type { WatermarkImageItem, WatermarkStatus } from '../types'

export default defineComponent({
  name: 'WatermarkImageList',
  props: {
    imageList: {
      type: Array as PropType<WatermarkImageItem[]>,
      required: true,
    },
    currentIndex: {
      type: Number,
      required: true,
    },
  },
  emits: ['Select', 'Remove'],
  methods: {
    /**
     * 状态文案
     * @param status 处理状态
     * @returns 文案
     */
    ResolveStatusText(status: WatermarkStatus): string {
      const map: Record<WatermarkStatus, string> = {
        pending: '待处理',
        processing: '处理中',
        completed: '已完成',
        error: '处理失败',
      }
      return map[status]
    },
    /**
     * 派发选中
     * @param index 下标
     */
    EmitSelect(index: number) {
      this.$emit('Select', index)
    },
    /**
     * 派发删除
     * @param index 下标
     */
    EmitRemove(index: number) {
      this.$emit('Remove', index)
    },
  },
})
</script>

<style scoped>
.image-list-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
  margin: 4px 0;
  padding: 14px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(49, 65, 95, 0.1);
  border-radius: 16px;
}

.image-item {
  position: relative;
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(49, 65, 95, 0.1);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.image-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 18px rgba(29, 42, 68, 0.1);
}

.image-item.active {
  box-shadow: 0 0 0 2px #3d6eb0;
}

.thumbnail {
  height: 130px;
  width: 100%;
  object-fit: cover;
  display: block;
  background: #eef2f8;
}

.image-info {
  padding: 8px 10px 10px;
}

.image-name {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.82rem;
  color: #31415f;
}

.process-status {
  display: inline-block;
  margin-top: 6px;
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 0.72rem;
}

.process-status.pending {
  background: rgba(49, 65, 95, 0.08);
  color: #5a6a84;
}

.process-status.processing {
  background: rgba(176, 132, 46, 0.14);
  color: #8a6418;
}

.process-status.completed {
  background: rgba(46, 125, 90, 0.12);
  color: #1f6b4a;
}

.process-status.error {
  background: rgba(176, 61, 61, 0.12);
  color: #9f2f2f;
}

.remove-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: rgba(176, 61, 61, 0.92);
  color: #fff;
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.image-item:hover .remove-btn {
  display: flex;
}
</style>
