<template>
  <div class="app-shell">
    <header class="hero">
      <div class="hero-copy">
        <p class="brand">Fuse Beads</p>
        <h1>拼豆豆图纸生成器</h1>
        <p class="subtitle">输入文字，一键生成可打印的拼豆像素图纸</p>
      </div>
    </header>

    <main class="workspace">
      <ControlPanel
        :text="text"
        :fontSize="fontSize"
        :threshold="threshold"
        :beadSize="beadSize"
        :beadColor="beadColor"
        :backgroundColor="backgroundColor"
        :showStroke="showStroke"
        :strokeColor="strokeColor"
        :strokeWidth="strokeWidth"
        :showGrid="showGrid"
        @UpdateText="HandleUpdateText"
        @UpdateFontSize="HandleUpdateFontSize"
        @UpdateThreshold="HandleUpdateThreshold"
        @UpdateBeadSize="HandleUpdateBeadSize"
        @UpdateBeadColor="HandleUpdateBeadColor"
        @UpdateBackgroundColor="HandleUpdateBackgroundColor"
        @UpdateShowStroke="HandleUpdateShowStroke"
        @UpdateStrokeColor="HandleUpdateStrokeColor"
        @UpdateStrokeWidth="HandleUpdateStrokeWidth"
        @UpdateShowGrid="HandleUpdateShowGrid"
        @ExportImage="HandleExportImage"
      />

      <BeadCanvas
        ref="beadCanvas"
        :text="text"
        :fontSize="fontSize"
        :threshold="threshold"
        :beadSize="beadSize"
        :beadColor="beadColor"
        :backgroundColor="backgroundColor"
        :showStroke="showStroke"
        :strokeColor="strokeColor"
        :strokeWidth="strokeWidth"
        :showGrid="showGrid"
      />
    </main>
  </div>
</template>

<script lang="ts">
/**
 * 根页面组件
 * 使用 Options API 管理拼豆图纸生成器的全局状态与导出入口
 */
import { defineComponent } from 'vue'
import ControlPanel from './components/ControlPanel.vue'
import BeadCanvas from './components/BeadCanvas.vue'

export default defineComponent({
  name: 'App',
  components: {
    ControlPanel,
    BeadCanvas,
  },
  data() {
    return {
      text: '拼豆',
      fontSize: 48,
      threshold: 200,
      beadSize: 14,
      beadColor: '#2f6fed',
      backgroundColor: '#f7f4ef',
      showStroke: true,
      strokeColor: '#1a1a1a',
      strokeWidth: 1.5,
      showGrid: true,
    }
  },
  /**
   * 组件创建时初始化默认文案
   */
  created() {
    if (!this.text) {
      this.text = '拼豆'
    }
  },
  methods: {
    /**
     * 更新输入文字
     * @param value 新文字
     */
    HandleUpdateText(value: string) {
      this.text = value
    },
    /**
     * 更新采样字号
     * @param value 字号
     */
    HandleUpdateFontSize(value: number) {
      this.fontSize = value
    },
    /**
     * 更新亮度阈值
     * @param value 阈值
     */
    HandleUpdateThreshold(value: number) {
      this.threshold = value
    },
    /**
     * 更新珠子尺寸
     * @param value 尺寸
     */
    HandleUpdateBeadSize(value: number) {
      this.beadSize = value
    },
    /**
     * 更新珠子颜色
     * @param value 颜色
     */
    HandleUpdateBeadColor(value: string) {
      this.beadColor = value
    },
    /**
     * 更新背景颜色
     * @param value 颜色
     */
    HandleUpdateBackgroundColor(value: string) {
      this.backgroundColor = value
    },
    /**
     * 更新描边开关
     * @param value 是否描边
     */
    HandleUpdateShowStroke(value: boolean) {
      this.showStroke = value
    },
    /**
     * 更新描边颜色
     * @param value 颜色
     */
    HandleUpdateStrokeColor(value: string) {
      this.strokeColor = value
    },
    /**
     * 更新描边粗细
     * @param value 粗细
     */
    HandleUpdateStrokeWidth(value: number) {
      this.strokeWidth = value
    },
    /**
     * 更新网格显示开关
     * @param value 是否显示网格
     */
    HandleUpdateShowGrid(value: boolean) {
      this.showGrid = value
    },
    /**
     * 触发子组件导出 PNG 图纸
     */
    HandleExportImage() {
      const canvasRef = this.$refs.beadCanvas as {
        ExportImage?: () => void
      }
      if (canvasRef && typeof canvasRef.ExportImage === 'function') {
        canvasRef.ExportImage()
      }
    },
  },
})
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.hero {
  position: relative;
  min-height: 28vh;
  display: flex;
  align-items: flex-end;
  padding: 48px 6vw 36px;
  background:
    radial-gradient(circle at 18% 20%, rgba(255, 196, 92, 0.45), transparent 42%),
    radial-gradient(circle at 82% 10%, rgba(84, 148, 255, 0.35), transparent 40%),
    linear-gradient(145deg, #1d2a44 0%, #31486f 48%, #4d6d9a 100%);
  overflow: hidden;
}

.hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255, 255, 255, 0.18) 1.2px, transparent 1.2px);
  background-size: 18px 18px;
  opacity: 0.35;
  pointer-events: none;
  animation: drift 18s linear infinite;
}

.hero-copy {
  position: relative;
  z-index: 1;
  color: #fff8ef;
  max-width: 720px;
}

.brand {
  margin: 0 0 8px;
  font-family: 'ZCOOL KuaiLe', cursive;
  font-size: clamp(2.4rem, 6vw, 4rem);
  letter-spacing: 0.04em;
  line-height: 1;
  animation: riseIn 0.7s ease both;
}

.hero h1 {
  margin: 0;
  font-size: clamp(1.35rem, 2.6vw, 1.9rem);
  font-weight: 700;
  letter-spacing: 0.02em;
  animation: riseIn 0.8s ease 0.08s both;
}

.subtitle {
  margin: 12px 0 0;
  font-size: 1rem;
  opacity: 0.88;
  animation: riseIn 0.8s ease 0.16s both;
}

.workspace {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(280px, 360px) 1fr;
  gap: 24px;
  padding: 28px 6vw 48px;
}

@keyframes riseIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes drift {
  from {
    background-position: 0 0;
  }
  to {
    background-position: 72px 36px;
  }
}

@media (max-width: 900px) {
  .workspace {
    grid-template-columns: 1fr;
  }

  .hero {
    min-height: 22vh;
    padding-top: 36px;
  }
}
</style>
