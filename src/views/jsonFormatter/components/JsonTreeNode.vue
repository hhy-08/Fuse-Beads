<template>
  <div class="json-tree-node" :class="{ root: isRoot }">
    <div
      class="tree-row"
      :class="{ selected: selectedPath === nodePath, clickable: expandable }"
      :style="rowStyle"
      @click="HandleRowClick"
    >
      <span
        v-for="level in depth"
        :key="`guide-${level}`"
        class="guide-line"
        :style="{ left: `${(level - 1) * 18 + 11}px` }"
      />
      <button
        v-if="expandable"
        type="button"
        class="toggle"
        :aria-expanded="!isCollapsed"
        :title="isCollapsed ? '展开' : '收起'"
        @click.stop="HandleToggle"
      >
        <span class="caret" :class="{ open: !isCollapsed }" />
      </button>
      <span v-else class="toggle-spacer" />

      <span v-if="showKey" class="token" :class="keyClass">{{ displayKey }}</span>
      <span v-if="showKey" class="token punct">: </span>

      <template v-if="expandable">
        <template v-if="isCollapsed">
          <span class="token punct">{{ openBracket }}</span>
          <span class="token preview">...</span>
          <span class="token punct">{{ closeBracket }}</span>
          <span v-if="!isLast" class="token punct">,</span>
          <span class="token comment"> // {{ childCount }} items</span>
        </template>
        <template v-else>
          <span class="token punct">{{ openBracket }}</span>
          <span v-if="childCount === 0" class="token punct">{{ closeBracket }}</span>
          <span v-if="childCount === 0 && !isLast" class="token punct">,</span>
        </template>
      </template>
      <template v-else>
        <span class="token" :class="primitiveClass">{{ primitiveText }}</span>
        <span v-if="!isLast" class="token punct">,</span>
      </template>
    </div>

    <template v-if="expandable && !isCollapsed && childCount > 0">
      <JsonTreeNode
        v-for="child in children"
        :key="child.path"
        :value="child.value"
        :key-name="child.key"
        :path="child.path"
        :depth="depth + 1"
        :is-last="child.isLast"
        :is-root="false"
        :parent-is-array="kind === 'array'"
        :collapsed-paths="collapsedPaths"
        :selected-path="selectedPath"
        @Toggle="$emit('Toggle', $event)"
        @Select="$emit('Select', $event)"
      />
      <div
        class="tree-row close-row"
        :class="{ selected: selectedPath === nodePath }"
        :style="rowStyle"
        @click="HandleSelect"
      >
        <span
          v-for="level in depth"
          :key="`close-guide-${level}`"
          class="guide-line"
          :style="{ left: `${(level - 1) * 18 + 11}px` }"
        />
        <span class="toggle-spacer" />
        <span class="token punct">{{ closeBracket }}</span>
        <span v-if="!isLast" class="token punct">,</span>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
/**
 * JSON 可折叠树节点（递归）
 * 支持对象 / 数组展开收起、语法高亮与折叠摘要
 */
import { defineComponent, type PropType } from 'vue'
import {
  CountJsonChildren,
  FormatJsonPrimitive,
  IsJsonExpandable,
  ListJsonTreeChildren,
  ResolveJsonTreeKind,
  type JsonTreeChild,
  type JsonTreeKind,
} from '@/utils/JsonFormatter'

export default defineComponent({
  name: 'JsonTreeNode',
  props: {
    value: {
      required: true,
    },
    keyName: {
      type: String as PropType<string | null>,
      default: null,
    },
    path: {
      type: String,
      default: 'root',
    },
    depth: {
      type: Number,
      default: 0,
    },
    isLast: {
      type: Boolean,
      default: true,
    },
    isRoot: {
      type: Boolean,
      default: false,
    },
    collapsedPaths: {
      type: Object as PropType<Record<string, boolean>>,
      default: () => ({}),
    },
    selectedPath: {
      type: String,
      default: '',
    },
    /** 父级是否为数组（数组下标不显示引号） */
    parentIsArray: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['Toggle', 'Select'],
  computed: {
    /**
     * 当前节点路径
     * @returns 路径
     */
    nodePath(): string {
      return this.path
    },
    /**
     * 是否可展开
     * @returns 布尔
     */
    expandable(): boolean {
      return IsJsonExpandable(this.value)
    },
    /**
     * 节点类型
     * @returns 类型
     */
    kind(): JsonTreeKind {
      return ResolveJsonTreeKind(this.value)
    },
    /**
     * 是否处于折叠态
     * @returns 布尔
     */
    isCollapsed(): boolean {
      return !!this.collapsedPaths[this.nodePath]
    },
    /**
     * 子项数量
     * @returns 数量
     */
    childCount(): number {
      return CountJsonChildren(this.value)
    },
    /**
     * 子节点列表
     * @returns 子节点
     */
    children(): JsonTreeChild[] {
      return ListJsonTreeChildren(this.value, this.nodePath)
    },
    /**
     * 是否显示键名
     * @returns 布尔
     */
    showKey(): boolean {
      return this.keyName != null && this.keyName !== '' && !this.isRoot
    },
    /**
     * 展示用键名
     * @returns 键名
     */
    displayKey(): string {
      if (this.keyName == null) {
        return ''
      }
      if (this.parentIsArray) {
        return this.keyName
      }
      return `"${this.keyName}"`
    },
    /**
     * 键名样式类
     * @returns 类名
     */
    keyClass(): string {
      return this.parentIsArray ? 'index' : 'key'
    },
    /**
     * 开括号
     * @returns 字符
     */
    openBracket(): string {
      return this.kind === 'array' ? '[' : '{'
    },
    /**
     * 闭括号
     * @returns 字符
     */
    closeBracket(): string {
      return this.kind === 'array' ? ']' : '}'
    },
    /**
     * 原始值展示文本
     * @returns 文本
     */
    primitiveText(): string {
      return FormatJsonPrimitive(this.value)
    },
    /**
     * 原始值样式类
     * @returns 类名
     */
    primitiveClass(): string {
      return this.kind
    },
    /**
     * 行内缩进样式（含层级参考线）
     * @returns 样式对象
     */
    rowStyle(): Record<string, string> {
      const indent = Math.max(this.depth, 0) * 18
      return {
        paddingLeft: `${indent + 4}px`,
        '--depth': String(this.depth),
      }
    },
  },
  methods: {
    /**
     * 切换展开 / 收起
     */
    HandleToggle() {
      if (!this.expandable) {
        return
      }
      this.$emit('Toggle', this.nodePath)
    },
    /**
     * 选中当前行
     */
    HandleSelect() {
      this.$emit('Select', this.nodePath)
    },
    /**
     * 点击行：仅选中高亮（展开由三角按钮控制）
     */
    HandleRowClick() {
      this.HandleSelect()
    },
  },
})
</script>

<style scoped>
.json-tree-node {
  position: relative;
}

.tree-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  min-height: 22px;
  padding-top: 1px;
  padding-bottom: 1px;
  padding-right: 8px;
  border-radius: 4px;
  font: 0.88rem/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: #1f2a3d;
  position: relative;
}

.guide-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 0;
  border-left: 1px dotted rgba(122, 135, 156, 0.5);
  pointer-events: none;
}

.tree-row.clickable {
  cursor: pointer;
}

.tree-row:hover {
  background: rgba(49, 72, 111, 0.05);
}

.tree-row.selected {
  background: rgba(255, 214, 102, 0.55);
}

.toggle,
.toggle-spacer {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-right: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.toggle {
  border: none;
  padding: 0;
  background: transparent;
  cursor: pointer;
  border-radius: 3px;
}

.toggle:hover {
  background: rgba(49, 72, 111, 0.1);
}

.caret {
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 4px 0 4px 6px;
  border-color: transparent transparent transparent #7a879c;
  transition: transform 0.12s ease;
  transform: rotate(0deg);
}

.caret.open {
  transform: rotate(90deg);
}

.token.key {
  color: #8b4513;
}

.token.index {
  color: #6a737d;
}

.token.string {
  color: #22863a;
}

.token.number {
  color: #005cc5;
}

.token.boolean {
  color: #d73a49;
}

.token.null {
  color: #6a737d;
  font-style: italic;
}

.token.punct {
  color: #586069;
}

.token.preview {
  color: #6a737d;
}

.token.comment {
  color: #6a737d;
  font-style: italic;
  margin-left: 4px;
}
</style>
