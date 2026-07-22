<template>
  <div class="watermark-settings">
    <h3>水印设置</h3>

    <div class="setting-item">
      <label>水印文字</label>
      <input
        type="text"
        class="text-input"
        :value="text"
        @input="EmitText"
      />
    </div>

    <div class="setting-item">
      <label>文字颜色</label>
      <input type="color" class="color-input" :value="color" @input="EmitColor" />
    </div>

    <div class="setting-item">
      <label>字体大小</label>
      <div class="range-wrapper">
        <input
          type="range"
          min="12"
          max="72"
          :value="fontSize"
          @input="EmitFontSize"
        />
        <span class="range-value">{{ fontSize }}px</span>
      </div>
    </div>

    <div class="setting-item">
      <label>透明度</label>
      <div class="range-wrapper">
        <input
          type="range"
          min="0"
          max="100"
          :value="opacity"
          @input="EmitOpacity"
        />
        <span class="range-value">{{ opacity }}%</span>
      </div>
    </div>

    <div class="setting-item">
      <label>旋转角度</label>
      <div class="range-wrapper">
        <input
          type="range"
          min="0"
          max="360"
          :value="rotation"
          @input="EmitRotation"
        />
        <span class="range-value">{{ rotation }}°</span>
      </div>
    </div>

    <div class="setting-item">
      <label>水印位置</label>
      <div class="position-grid">
        <button
          v-for="pos in positions"
          :key="pos.id"
          type="button"
          class="position-btn"
          :class="{ active: position === pos.id }"
          @click="EmitPosition(pos.id)"
        >
          {{ pos.label }}
        </button>
      </div>
    </div>

    <div class="setting-item">
      <label class="checkbox-label">
        <input type="checkbox" :checked="isTiled" @change="EmitIsTiled" />
        平铺水印
      </label>
      <div v-if="isTiled" class="tile-settings">
        <div class="setting-item">
          <label>水平间距</label>
          <div class="range-wrapper">
            <input
              type="range"
              min="20"
              max="200"
              :value="tileSpacingX"
              @input="EmitTileSpacingX"
            />
            <span class="range-value">{{ tileSpacingX }}px</span>
          </div>
        </div>
        <div class="setting-item">
          <label>垂直间距</label>
          <div class="range-wrapper">
            <input
              type="range"
              min="20"
              max="200"
              :value="tileSpacingY"
              @input="EmitTileSpacingY"
            />
            <span class="range-value">{{ tileSpacingY }}px</span>
          </div>
        </div>
      </div>
    </div>

    <div class="setting-item">
      <label class="checkbox-label">
        <input type="checkbox" :checked="isDraggable" @change="EmitIsDraggable" />
        自由拖动
      </label>
    </div>
  </div>
</template>

<script lang="ts">
/**
 * 水印参数设置面板
 * 控制文字、颜色、字号、透明度、位置、平铺与拖动
 */
import { defineComponent, type PropType } from 'vue'
import type { WatermarkPositionId } from '../types'

export default defineComponent({
  name: 'WatermarkSettingsPanel',
  props: {
    text: { type: String, required: true },
    color: { type: String, required: true },
    fontSize: { type: Number, required: true },
    opacity: { type: Number, required: true },
    position: { type: String as PropType<WatermarkPositionId>, required: true },
    rotation: { type: Number, required: true },
    isTiled: { type: Boolean, required: true },
    tileSpacingX: { type: Number, required: true },
    tileSpacingY: { type: Number, required: true },
    isDraggable: { type: Boolean, required: true },
  },
  emits: [
    'UpdateText',
    'UpdateColor',
    'UpdateFontSize',
    'UpdateOpacity',
    'UpdatePosition',
    'UpdateRotation',
    'UpdateIsTiled',
    'UpdateTileSpacingX',
    'UpdateTileSpacingY',
    'UpdateIsDraggable',
  ],
  data() {
    return {
      positions: [
        { id: 'topLeft' as WatermarkPositionId, label: '左上' },
        { id: 'topCenter' as WatermarkPositionId, label: '中上' },
        { id: 'topRight' as WatermarkPositionId, label: '右上' },
        { id: 'middleLeft' as WatermarkPositionId, label: '左中' },
        { id: 'center' as WatermarkPositionId, label: '中心' },
        { id: 'middleRight' as WatermarkPositionId, label: '右中' },
        { id: 'bottomLeft' as WatermarkPositionId, label: '左下' },
        { id: 'bottomCenter' as WatermarkPositionId, label: '下中' },
        { id: 'bottomRight' as WatermarkPositionId, label: '右下' },
      ],
    }
  },
  methods: {
    /**
     * 派发文字变更
     * @param event 输入事件
     */
    EmitText(event: Event) {
      const target = event.target as HTMLInputElement
      this.$emit('UpdateText', target.value)
    },
    /**
     * 派发颜色变更
     * @param event 输入事件
     */
    EmitColor(event: Event) {
      const target = event.target as HTMLInputElement
      this.$emit('UpdateColor', target.value)
    },
    /**
     * 派发字号变更
     * @param event 输入事件
     */
    EmitFontSize(event: Event) {
      const target = event.target as HTMLInputElement
      this.$emit('UpdateFontSize', Number(target.value))
    },
    /**
     * 派发透明度变更
     * @param event 输入事件
     */
    EmitOpacity(event: Event) {
      const target = event.target as HTMLInputElement
      this.$emit('UpdateOpacity', Number(target.value))
    },
    /**
     * 派发位置变更
     * @param value 位置 ID
     */
    EmitPosition(value: WatermarkPositionId) {
      this.$emit('UpdatePosition', value)
    },
    /**
     * 派发旋转角度变更
     * @param event 输入事件
     */
    EmitRotation(event: Event) {
      const target = event.target as HTMLInputElement
      this.$emit('UpdateRotation', Number(target.value))
    },
    /**
     * 派发平铺开关
     * @param event 变更事件
     */
    EmitIsTiled(event: Event) {
      const target = event.target as HTMLInputElement
      this.$emit('UpdateIsTiled', target.checked)
    },
    /**
     * 派发水平间距
     * @param event 输入事件
     */
    EmitTileSpacingX(event: Event) {
      const target = event.target as HTMLInputElement
      this.$emit('UpdateTileSpacingX', Number(target.value))
    },
    /**
     * 派发垂直间距
     * @param event 输入事件
     */
    EmitTileSpacingY(event: Event) {
      const target = event.target as HTMLInputElement
      this.$emit('UpdateTileSpacingY', Number(target.value))
    },
    /**
     * 派发拖动开关
     * @param event 变更事件
     */
    EmitIsDraggable(event: Event) {
      const target = event.target as HTMLInputElement
      this.$emit('UpdateIsDraggable', target.checked)
    },
  },
})
</script>

<style scoped>
.watermark-settings {
  padding: 18px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(49, 65, 95, 0.1);
  height: fit-content;
}

.watermark-settings h3 {
  margin: 0 0 8px;
  font-size: 1.05rem;
  color: #1f2a3d;
}

.setting-item {
  margin: 14px 0;
}

.setting-item > label {
  display: block;
  margin-bottom: 8px;
  color: #31415f;
  font-weight: 500;
  font-size: 0.9rem;
}

.text-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid rgba(49, 65, 95, 0.2);
  border-radius: 8px;
  background: #fff;
}

.color-input {
  width: 52px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: transparent;
}

.range-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.range-wrapper input[type='range'] {
  flex: 1;
}

.range-value {
  min-width: 56px;
  text-align: right;
  color: #6a7a94;
  font-size: 0.85rem;
}

.position-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.position-btn {
  padding: 8px 4px;
  border: 1px solid rgba(49, 65, 95, 0.18);
  border-radius: 8px;
  background: #fff;
  color: #31415f;
  cursor: pointer;
  font: inherit;
  font-size: 0.85rem;
}

.position-btn.active {
  background: #31486f;
  color: #fff8ef;
  border-color: #31486f;
}

.checkbox-label {
  display: flex !important;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  margin-bottom: 0 !important;
}

.tile-settings {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(49, 72, 111, 0.06);
}

.tile-settings .setting-item {
  margin: 10px 0;
}
</style>
