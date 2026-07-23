# Fuse Kit · Fuse 工具箱

基于 **Vue 3 + Vite** 的本地实用小工具集合（Options API）。提供拼豆图纸、图片压缩、水印、格式转换、单位换算等能力。

## 功能

- 工具列表首页：按「拼豆配套 / 图片类 / 文本办公 / 趣味生活」分类展示入口
- 文字或图片 → 像素拼豆图案（图片自动匹配 MARD 色卡）
- 可选字体采样（黑体 / 宋体 / 站酷 / 毛笔 / 像素等）
- 可调字间距（可负值叠连），支持逐字颜色、字号、加粗/倾斜/下划线/删除线、垂直对齐（顶/中/底）
- 方格像素图纸样式（贴合常见拼豆图纸，非圆形珠）
- MARD 291 色卡选择珠子颜色与描边颜色，格子内显示色号
- 整块图案外轮廓描边豆（按豆数扩宽，可实际拼接）
- Canvas 实时预览（可缩放）与 PNG 导出，生成后统计各色号用量与占比
- 可调：模式、采样字体、图片宽高、透明抠图、格子尺寸、背景色、辅助网格
- 像素画布：手绘 / 橡皮 / 取色 / 填充 / 图层 / 网格，导出像素图或拼豆图纸，可无损发送到拼豆生成器
- 像素图缩放：最近邻插值放大，整数倍或指定尺寸，可导出 PNG 并送入拼豆工具
- 配色模拟：多色号实时预览搭配，本地保存配色方案
- 图纸尺寸计算：按宽高估算拼豆板规格与豆子总数，上传图纸统计各色用量
- 二维码生成：文字/链接、前景/背景色、中心图标、纠错等级、PNG / JPEG / WebP 导出

## 技术栈

- Vue 3（Options API：`created` / `mounted` / `beforeUnmount` / `watch`）
- Vue Router 4（按目录自动聚合路由）
- Vuex 4 + vuex-persistedstate（sessionStorage 持久化）
- Vite 5 + TypeScript
- Canvas 2D 绘制

## 快速开始

```bash
npm install --registry https://registry.npmjs.org
npm run dev
```

### 多环境命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发环境本地启动（`.env.dev`） |
| `npm run test` | 测试环境本地启动（`.env.test`） |
| `npm run prod` | 生产环境本地启动（`.env.prod`） |
| `npm run build-dev` | 开发环境打包 |
| `npm run build-test` | 测试环境打包 |
| `npm run build` / `npm run build-prod` | 生产环境打包 |
| `npm run preview` | 预览构建产物 |

环境变量文件：`.env.dev` / `.env.test` / `.env.prod`  
主要字段：`VITE_ENV`、`VITE_API_BASE_URL`、`VITE_APP_TITLE`（默认 Fuse 工具箱）、`VITE_BASE_ROUTE`

## 路由

| 路径 | 说明 |
|------|------|
| `/` | 工具列表（默认首页） |
| `/generator` | 拼豆图纸生成器 |
| `/image-compress` | 图片压缩工具 |
| `/watermark` | 图片水印工具 |
| `/image-converter` | 图片格式转换 |
| `/unit-converter` | 单位转换 |
| `/file-converter` | 文件转换（纯前端） |
| `/about` | 关于页 |

## 项目结构

```
public/
  index.html              # HTML 模板（vite-plugin-html）
  favicon.ico
.env.dev / .env.test / .env.prod
src/
  App.vue                 # 根组件（router-view）
  main.ts                 # 注册 router / store
  router/
    index.ts              # 路由实例与前置守卫
    routes.ts             # 自动聚合各业务路由
    tools/index.ts
    generator/index.ts
    imageCompress/index.ts
    watermark/index.ts
    imageConverter/index.ts
    unitConverter/index.ts
    fileConverter/index.ts
    about/index.ts
  store/
    index.ts              # Vuex 入口 + 持久化
    state.ts / getters.ts / mutations.ts / actions.ts
    modules/generator.ts  # 图纸参数状态
  views/
    tools/index.vue       # 工具列表首页
    generator/index.vue   # 拼豆生成器页
    imageCompress/index.vue # 图片压缩页
    watermark/            # 图片水印工具
    imageConverter/index.vue # 图片格式转换
    unitConverter/index.vue  # 单位转换
    fileConverter/index.vue  # 文件转换
    about/index.vue       # 关于页
  components/
    ControlPanel.vue
    BeadCanvas.vue
  utils/
    Env.ts                # 环境变量读取
    Brand.ts              # 品牌名 / 产品名常量
    ToolList.ts           # 首页工具列表配置
    ImageCompress.ts      # 图片压缩（质量/缩放/GIF）
    ImageConverter.ts     # 图片格式转换
    UnitConverter.ts      # 单位换算
    FileConverter.ts      # 文件转换（PDF/DOCX/XLSX 等）
    TextToPixels.ts
    DrawBeadPattern.ts
    MardColors.ts          # MARD 291 色卡
    FontOptions.ts         # 可选采样字体
  styles/main.css
```

## 会话总结

### 2026-07-23（自由分割切线长度可调）

- **会话目的**：自由分割切线支持调整长度，可只切割图片上半部分等局部区域。
- **完成任务**：
  - 切线模型改为带 `start/end` 的线段，不再强制贯穿整图
  - 预览端点可拖拽缩短/拉长；拖动线条本身仍可平移
  - 导出按线段局部切割矩形区域（非整幅网格贯穿）
- **关键决策**：新增切线默认仍贯穿整图，用户拖两端圆点即可只保留上半段等局部切割。
- **修改文件**：`src/utils/ImageJoin.ts`、`src/views/imageJoin/index.vue`、`README.md`

### 2026-07-23（自由分割顶栏 + 切线颜色）

- **会话目的**：自由分割独立为顶栏入口；切线增加颜色选项并提高可见度。
- **完成任务**：顶栏增加「自由分割」与「均等分割」并列；切线可选青/红/黄/绿/粉/橙/白，加粗并带描边光晕。
- **关键决策**：不再嵌套在均等分割内；切线颜色用 CSS 变量统一控制。
- **修改文件**：`src/views/imageJoin/index.vue`、`README.md`

### 2026-07-23（自由分割）

- **会话目的**：分割工具增加自由切线分割，不限于均等行列。
- **完成任务**：均等/自由双模式；预览图点击加横竖切线、拖动调整、双击删除；预览与 ZIP 导出按自定义切线切分。
- **关键决策**：切线生成不规则网格；复用分块预览与打包下载流程。
- **修改文件**：`src/utils/ImageJoin.ts`、`src/views/imageJoin/index.vue`、`README.md`

### 2026-07-23（分割预览空白修复）

- **会话目的**：修复分割预览仅第一张有图、其余空白。
- **完成任务**：改用 `img` + `overflow` + `transform` 裁切预览，替代错误的 `background-position` 百分比算法。
- **关键决策**：translate 百分比相对图片自身尺寸，与切分坐标一一对应。
- **修改文件**：`src/views/imageJoin/index.vue`、`README.md`

### 2026-07-23（分割效果预览）

- **会话目的**：图片分割增加可视化预览，便于确认切分效果。
- **完成任务**：原图叠加真实切线；下方宫格展示各块裁切预览与尺寸标注。
- **关键决策**：用与导出一致的 `BuildGridSlices` 坐标；小块预览用 CSS background 定位，避免频繁生成 Blob。
- **修改文件**：`src/utils/ImageJoin.ts`、`src/views/imageJoin/index.vue`、`README.md`

### 2026-07-23（拼接自由拖放）

- **会话目的**：支持画布上自由拖放摆放图片，实现任意一排多张等自定义布局。
- **完成任务**：新增「自由拖放」模式与 `FreeLayoutCanvas`；拖动改坐标、点选置顶；导出按内容包围盒裁切；可一键按网格重新排布。
- **关键决策**：保留自动网格与自由拖放双模式；自由模式列表顺序决定图层上下（后点选在上）。
- **修改文件**：`src/utils/ImageJoin.ts`、`src/views/imageJoin/index.vue`、`src/views/imageJoin/components/FreeLayoutCanvas.vue`、`README.md`

### 2026-07-23（拼接每行多张）

- **会话目的**：拼接支持一排 2 张等多列布局，不再仅限单列竖排。
- **完成任务**：增加「每行张数」1–4；多列时整行左右对齐、单张行内上下对齐；列表顺序决定从左到右、从上到下排布。
- **关键决策**：按阅读顺序自动分行；非自由画布拖放定位，用每行张数 + 排序实现「一排多个」。
- **修改文件**：`src/utils/ImageJoin.ts`、`src/views/imageJoin/index.vue`、`README.md`

### 2026-07-23（拼接缩放与左右对齐）

- **会话目的**：完善长图拼接，支持每张图独立缩放与水平布局。
- **完成任务**：单图缩放 10%–200%、左/中/右对齐；批量对齐与重置 100%；预览防抖刷新。
- **关键决策**：画布宽度取缩放后最大宽；对齐相对整张长图画布。
- **修改文件**：`src/utils/ImageJoin.ts`、`src/views/imageJoin/index.vue`、`README.md`

### 2026-07-23（长图拼接 / 图片分割）

- **会话目的**：新增长图拼接与图片均等分割工具。
- **完成任务**：
  - 多图竖向拼接（最大宽对齐、居中、可调间距），导出 PNG 并支持预览
  - 单图按行×列均等分割，余数并入末行/末列；多图 ZIP、单图直下 PNG
  - 首页图片类工具增加入口 `/image-join`
- **关键决策**：
  - 单页双 Tab（拼接 / 分割），不做横向拼接与送入生成器
  - 分割网格 1–20 行/列，本地 Canvas + JSZip
- **修改文件**：
  - 新增 `src/utils/ImageJoin.ts`、`src/views/imageJoin/index.vue`、`src/router/imageJoin/index.ts`
  - 更新 `src/utils/ToolList.ts`、`README.md`

### 2026-07-23（图片裁剪顶部样式对齐）

- **会话目的**：图片裁剪页顶部样式与其他工具页保持一致。
- **完成任务**：将 `.hero` / `.brand` 等样式对齐图片压缩页（大号品牌字、相同渐变与内边距）。
- **关键决策**：复用压缩工具页的 hero 视觉规范，去掉裁剪页自定义的浅色页面底与小号 brand。
- **修改文件**：`src/views/imageCrop/index.vue`、`README.md`

### 2026-07-23（图片裁剪工具）

- **会话目的**：新增图片裁剪 & 形状裁切工具，用于头像与素材预处理。
- **完成任务**：
  - 实现自由矩形、固定比例（含自定义）、圆形、圆角裁切
  - 裁切框支持拖移与八向手柄缩放，本地 Canvas 导出透明底 PNG
  - 支持下载与送入拼豆生成器；首页图片类工具增加入口
- **关键决策**：
  - 按图片压缩等工具模式做独立路由页，不嵌入生成器
  - 圆形强制 1:1；圆角半径按裁切框短边百分比调节
  - 不做套索/多边形不规则裁切与批量多图
- **修改文件**：
  - 新增 `src/utils/ImageCrop.ts`、`src/views/imageCrop/index.vue`、`src/views/imageCrop/components/CropCanvas.vue`、`src/router/imageCrop/index.ts`
  - 更新 `src/utils/ToolList.ts`、`README.md`

### 2026-07-23（拼豆生成器色号用量）

- **会话目的**：生成图纸后统计每个颜色的数量。
- **完成任务**：按图案网格（含描边）汇总色号用量，在预览区展示色块、色号、数量与占比。
- **关键决策**：复用图纸计算器的用量数据结构，统计来自真实生成结果而非再次识图。
- **修改文件**：`src/utils/BoardCalculator.ts`、`src/components/BeadCanvas.vue`、`src/views/generator/index.vue`、`README.md`

### 2026-07-23（图纸色号优先识别）

- **会话目的**：修复上传带色号图纸后颜色识别不准。
- **完成任务**：按格子解码图纸；OCR 优先读取色号标注；失败再四角采样匹配 MARD；自动剔除 T1 等背景色。
- **关键决策**：不再整图缩小二次量化；自动检测本工具导出图纸的行列布局。
- **修改文件**：`src/utils/BeadBlueprintDecoder.ts`、`src/utils/BoardCalculator.ts`、`src/views/boardCalculator/index.vue`、`package.json`、`README.md`

### 2026-07-23（图纸尺寸计算器拖拽上传）

- **会话目的**：图纸尺寸计算器支持拖拽上传图片。
- **完成任务**：上传区支持拖入图片，拖拽态高亮提示。
- **关键决策**：与点击选择共用同一套文件校验逻辑。
- **修改文件**：`src/views/boardCalculator/index.vue`、`README.md`

### 2026-07-23（图纸尺寸计算器）

- **会话目的**：新增图纸尺寸计算器，服务拼豆备料。
- **完成任务**：输入宽高/描边估算板材与豆数；对照多种标准板；可选上传图纸做 MARD 色号用量统计。
- **关键决策**：豆距按 5mm 估算实物尺寸；推荐板型优先总块数少、余量少。
- **修改文件**：`src/utils/BoardCalculator.ts`、`src/views/boardCalculator/index.vue`、`src/router/boardCalculator/index.ts`、`src/utils/ToolList.ts`、`README.md`

### 2026-07-23（拼豆配色模拟器）

- **会话目的**：新增配色模拟工具，预览色号搭配并保存方案。
- **完成任务**：色号输入 / 色卡点选、网格/横条/叠色预览、localStorage 保存/加载/删除方案。
- **关键决策**：方案存浏览器本地；无效色号提示但不阻断有效色预览。
- **修改文件**：`src/utils/MardColors.ts`、`src/utils/PaletteSimulator.ts`、`src/views/paletteSimulator/index.vue`、`src/router/paletteSimulator/index.ts`、`src/utils/ToolList.ts`、`README.md`

### 2026-07-23（工具按类型分类）

- **会话目的**：首页工具按类型分组展示。
- **完成任务**：新增分类字段与分组 API；首页按区块展示分类标题、说明与工具卡片。
- **关键决策**：
  - 拼豆配套：拼豆工具 / 像素画布 / 像素图缩放 / 色卡对照
  - 图片类：压缩 / 水印 / 格式转换
  - 文本办公：文件转换 / 二维码生成
  - 趣味生活：单位转换
- **修改文件**：`src/utils/ToolList.ts`、`src/views/tools/index.vue`、`README.md`

### 2026-07-22（像素图缩放器）

- **会话目的**：新增最近邻像素图缩放工具，用于拼豆素材预处理。
- **完成任务**：整数倍 / 指定尺寸缩放、原图对照预览、导出 PNG、一键送入拼豆工具。
- **关键决策**：手写最近邻采样（非浏览器默认平滑缩放），保留透明通道。
- **修改文件**：`src/utils/PixelScaler.ts`、`src/views/pixelScaler/index.vue`、`src/router/pixelScaler/index.ts`、`src/utils/ToolList.ts`、`README.md`

### 2026-07-22（像素填充死机修复）

- **会话目的**：修复点击填充导致页面卡死。
- **完成任务**：洪水填充增加边界检查，避免越界 `null` 与空区域目标色匹配后无限扩张。
- **关键决策**：用 `Uint8Array` 标记已访问格，越界坐标直接跳过。
- **修改文件**：`src/utils/PixelCanvas.ts`、`README.md`

### 2026-07-22（像素画布编辑器）

- **会话目的**：新增像素画布，并与拼豆生成器无缝对接。
- **完成任务**：
  - 手绘 / 橡皮 / 取色 / 填充、多图层、网格、尺寸调整
  - 导出像素图 PNG、拼豆图纸 PNG
  - Vuex `importedPixelGrid` + `sourceMode: 'pixel'` 无损导入生成器
- **关键决策**：扁平化图层为 `ColoredPixelGrid` 后直接供 `BeadCanvas` 绘制，避免再走图片量化。
- **修改文件**：`src/utils/PixelCanvas.ts`、`src/views/pixelEditor/index.vue`、`src/router/pixelEditor/index.ts`、`src/store/modules/generator.ts`、`src/store/index.ts`、`src/components/BeadCanvas.vue`、`src/components/ControlPanel.vue`、`src/views/generator/index.vue`、`src/utils/ToolList.ts`、`README.md`

### 2026-07-22（二维码多格式导出）

- **会话目的**：二维码导出支持多种图片格式。
- **完成任务**：增加 PNG / JPEG / WebP 选择；JPEG/WebP 可调质量；按格式生成扩展名。
- **关键决策**：预览仍用 PNG；JPEG 导出前铺不透明底，避免透明通道问题。
- **修改文件**：`src/utils/QrCodeGenerator.ts`、`src/views/qrCode/index.vue`、`src/utils/ToolList.ts`、`README.md`

### 2026-07-22（二维码生成器）

- **会话目的**：新增二维码生成工具。
- **完成任务**：
  - 接入 `qrcode`，实现颜色、中心图标、PNG 导出
  - 新增页面 `/qrcode`、路由与工具列表入口
  - 嵌入图标时自动使用 H 纠错等级
- **关键决策**：纯前端生成；图标居中白底圆角，占比限制在 12%–28% 以保证可扫。
- **修改文件**：`src/utils/QrCodeGenerator.ts`、`src/views/qrCode/index.vue`、`src/router/qrCode/index.ts`、`src/utils/ToolList.ts`、`package.json`、`README.md`

### 2026-07-22（PDF 转图片中文空白修复）

- **会话目的**：部分 PDF（如电子发票）转图片后中文内容空白。
- **完成任务**：
  - 启用 pdf.js CMap + standard_fonts（同步到 `public/pdfjs`）
  - 提高渲染倍率，开启注解渲染与白底
  - 增加 `postinstall` / 构建前同步脚本
- **关键决策**：发票 PDF 多用 CID/CJK 字体，缺 CMap 时只剩线条、二维码与少量 ASCII；同步启用 `enableXfa` 兼容部分电子票。
- **修改文件**：`src/utils/FileConverter.ts`、`scripts/SyncPdfjsAssets.mjs`、`package.json`、`.gitignore`、`README.md`

### 2026-07-22（文件转换批量）

- **会话目的**：文件转换支持同格式多文件批量处理。
- **完成任务**：多选上传、同格式校验、逐个转换进度、多文件结果 ZIP 打包。
- **关键决策**：不同源格式不允许混选；单文件仍直接下载，多文件统一打包。
- **修改文件**：`src/utils/FileConverter.ts`、`src/views/fileConverter/index.vue`、`ToolList.ts`、`README.md`

### 2026-07-22（TXT 转 PDF 中文乱码修复）

- **会话目的**：TXT→PDF 中文乱码。
- **完成任务**：改用 Canvas + 浏览器中文字体排版再写入 PDF；文本读取增加 GBK 回退。
- **关键决策**：jsPDF 默认字体不含 CJK，直接 `text()` 会乱码，故走「画布渲染 → 图片嵌入 PDF」。
- **修改文件**：`src/utils/FileConverter.ts`、`README.md`

### 2026-07-22（文件转换纯前端）

- **会话目的**：参考 toolbox file-converter，但改为纯前端实现，并支持 PDF→PNG/JPG。
- **完成任务**：
  - 新增 `/file-converter`：PDF→PNG/JPG/TXT，TXT→PDF，DOCX→TXT/HTML，XLSX→CSV/JSON 等
  - 多页 PDF 出图自动 ZIP；明确排除 Word/Excel↔PDF 等需后端类型
  - 接入 pdfjs-dist / jspdf / mammoth / xlsx
- **关键决策**：只保留浏览器可可靠完成的转换，避免假依赖后端的入口。
- **修改文件**：
  - 新增 `src/utils/FileConverter.ts`、`src/views/fileConverter/index.vue`、`src/router/fileConverter/index.ts`
  - 更新 `ToolList.ts`、`Brand.ts`、`about`、`README.md`、`package.json`

### 2026-07-22（拼豆页顶部样式统一）

- **会话目的**：拼豆工具顶部样式与其他工具页不一致。
- **完成任务**：去掉大高度头图、点阵动画与入场动画，品牌字号与导航样式对齐其他工具页。
- **修改文件**：`src/views/generator/index.vue`、`README.md`

### 2026-07-22（项目品牌更名）

- **会话目的**：名称/标题改为更符合多工具箱定位。
- **完成任务**：
  - 品牌统一为 **Fuse Kit**，产品名 **Fuse 工具箱**
  - 更新 env / HTML / package.json / Vuex key / 各页页头与关于页文案
  - 新增 `Brand.ts` 集中管理品牌常量
- **关键决策**：拼豆仍为独立工具名；站点级标题改为工具箱，避免各页共用旧「图纸生成器」文案。
- **修改文件**：
  - 新增 `src/utils/Brand.ts`
  - 更新 `.env.*`、`index.html`、`public/index.html`、`package.json`
  - 更新各 `views/**`、`src/utils/Env.ts`、`src/store/*`、`README.md`

### 2026-07-22（单位转换工具）

- **会话目的**：参考 toolbox unit-converter 新增单位转换工具。
- **完成任务**：
  - 新增 `/unit-converter`：长度/重量/面积/体积/温度
  - 支持单位交换、换算比率说明、防抖历史记录
  - 工具列表增加入口
- **关键决策**：
  - 与参考一致使用自建换算系数（不引入 convert-units）
  - 修正平方千米系数：1 km² = 1,000,000 m²
- **修改文件**：
  - 新增 `src/utils/UnitConverter.ts`、`src/views/unitConverter/index.vue`、`src/router/unitConverter/index.ts`
  - 更新 `src/utils/ToolList.ts`、`README.md`

### 2026-07-22（水印旋转支持负值）

- **会话目的**：旋转角度支持负值。
- **完成任务**：旋转范围改为 -180°~180°，并增加数字输入便于精确设置。
- **修改文件**：`src/views/watermark/components/WatermarkSettings.vue`、`README.md`

### 2026-07-22（水印平铺可拖动）

- **会话目的**：平铺模式下无法自由拖动。
- **完成任务**：平铺绘制接入 `watermarkPos` 整体偏移；平铺时可在预览区任意位置拖动网格。
- **关键决策**：平铺与自由拖动可同时开启；拖动偏移用模运算保证网格连续铺满。
- **修改文件**：`PreviewCanvas.vue`、`WatermarkSettings.vue`、`watermark/index.vue`、`README.md`

### 2026-07-22（图片格式转换）

- **会话目的**：参考 toolbox image-converter 新增图片格式转换工具。
- **完成任务**：
  - 新增 `/image-converter`：多图上传，转 JPEG/PNG/WebP/GIF
  - 单张直接下载，多张打包 ZIP；JPEG/WebP 可调质量
  - 工具列表增加入口
- **关键决策**：
  - Canvas 转码；JPEG/GIF 先铺白底避免透明变黑
  - 转换逻辑抽到 `ImageConverter.ts`
- **修改文件**：
  - 新增 `src/utils/ImageConverter.ts`、`src/views/imageConverter/index.vue`、`src/router/imageConverter/index.ts`
  - 更新 `src/utils/ToolList.ts`、`README.md`

### 2026-07-22（水印单张下载）

- **会话目的**：单张加水印时缺少下载入口。
- **完成任务**：预览区与操作栏增加「下载当前图片」；多图才显示「打包下载全部」。
- **关键决策**：下载直接导出当前预览 Canvas，无需先点批量处理。
- **修改文件**：`src/views/watermark/index.vue`、`src/views/watermark/components/PreviewCanvas.vue`、`README.md`

### 2026-07-22（图片水印工具）

- **会话目的**：参考 toolbox watermark 在本项目新增图片水印工具。
- **完成任务**：
  - 新增 `/watermark`：多图上传、九宫格位置、平铺、旋转、透明度、自由拖动
  - 支持批量加水印与 ZIP 打包下载
  - 工具列表增加「图片水印工具」入口
- **关键决策**：
  - 沿用 Options API + 本站视觉，不引入 Element Plus
  - 预设位置切换时关闭自由拖动，避免坐标冲突
- **修改文件**：
  - 新增 `src/views/watermark/**`、`src/router/watermark/index.ts`
  - 更新 `src/utils/ToolList.ts`、`README.md`

### 2026-07-22（图片压缩对齐 toolbox）

- **会话目的**：参考 `tool/frontend` 的 image-compressor 重做本项目图片压缩页。
- **完成任务**：
  - 接入 `browser-image-compression` / `jszip` / `gifuct-js`
  - 支持多图拖拽上传、质量/缩放/最大宽高、进度条、结果表、单下/打包 ZIP
  - GIF 单独处理，其它格式走 browser-image-compression
  - 压缩逻辑抽到 `src/utils/ImageCompress.ts`，页面保持 Options API + 原生 UI
- **关键决策**：
  - 不引入 Element Plus，交互能力对齐参考页，视觉延续 Fuse Beads 风格
  - 文件大小限制：GIF ≤ 20MB，其它 ≤ 50MB
- **修改文件**：
  - 新增 `src/utils/ImageCompress.ts`
  - 重写 `src/views/imageCompress/index.vue`
  - 更新 `package.json`、`src/utils/ToolList.ts`、`README.md`

### 2026-07-22（工具列表首页）

- **会话目的**：创建工具列表页作为默认首页，点击进入各工具。
- **完成任务**：
  - 新增工具列表页 `/`，含拼豆工具、图片压缩工具、色卡对照（即将推出）
  - 拼豆工具路由改为 `/generator`
  - 新增图片压缩工具页 `/image-compress`（本地 Canvas 压缩）
  - 更新生成器/关于页导航回链
- **关键决策**：
  - 路由按目录自动聚合，工具配置集中在 `ToolList.ts`
  - 未就绪工具以禁用卡片展示，避免空跳转
- **修改文件**：
  - 新增 `src/views/tools/index.vue`、`src/views/imageCompress/index.vue`
  - 新增 `src/router/tools/index.ts`、`src/router/imageCompress/index.ts`、`src/utils/ToolList.ts`
  - 更新 `src/router/generator/index.ts`、`src/views/generator/index.vue`、`src/views/about/index.vue`、`README.md`

### 2026-07-22（图片清晰度 / 相近色合并）

- **会话目的**：图片转拼豆时可调清晰度，相近颜色统一，并带锐化效果。
- **完成任务**：
  - 新增清晰度 1~10：低=相近色合并/限色；高=细节更多+锐化
  - 采样前做 Unsharp Mask，采样后做相近色合并与最大色数限制
  - 控制面板增加清晰度滑杆
- **关键决策**：
  - 低清晰度使用最近邻缩放，色块更硬朗
  - 合并策略按色号用量从高到低并入主色，减少杂色
- **修改文件**：
  - 更新 `src/utils/ImageToPixels.ts`、`src/store/modules/generator.ts`
  - 更新 `src/components/ControlPanel.vue`、`src/components/BeadCanvas.vue`
  - 更新 `src/views/generator/index.vue`、`README.md`

### 2026-07-22（图片转拼豆）

- **会话目的**：新增图片转可拼豆像素图功能。
- **完成任务**：
  - 新增 `ImageToPixels`：缩放采样 + 最近 MARD 色匹配
  - 生成器增加「文字 / 图片」双模式切换
  - 支持上传图片、最大宽高、透明抠图阈值
  - 图片 dataURL 不写入 sessionStorage，避免撑爆缓存
- **关键决策**：
  - 颜色匹配使用加权欧氏距离，贴近人眼感知
  - 图片与文字共用描边、网格、色值、缩放与导出流程
- **修改文件**：
  - 新增 `src/utils/ImageToPixels.ts`
  - 更新 `src/store/modules/generator.ts`、`src/store/index.ts`
  - 更新 `src/components/ControlPanel.vue`、`src/components/BeadCanvas.vue`
  - 更新 `src/views/generator/index.vue`、`src/views/about/index.vue`
  - 更新 `src/utils/DrawBeadPattern.ts`、`README.md`

### 2026-07-22（预览缩放 + 大格子）

- **会话目的**：增加图片放大功能，并放大每个格子以便放下色值。
- **完成任务**：
  - 预览区增加缩放条 / ±− 按钮，支持 Ctrl/⌘+滚轮缩放（50%~300%）
  - 去掉 `max-width:100%` 强行缩小，改为可滚动查看真实比例
  - 格子尺寸默认提升到 40px，范围 28~72，绘制最小格边 28px
  - 旧会话格子过小时自动抬升到 40px
- **关键决策**：
  - 缩放只影响预览显示，导出仍按实际格子分辨率
  - 像素渲染使用 `pixelated`，放大后边缘更清晰
- **修改文件**：
  - 更新 `src/components/BeadCanvas.vue`、`src/components/ControlPanel.vue`
  - 更新 `src/store/modules/generator.ts`、`src/utils/DrawBeadPattern.ts`
  - 更新 `src/views/generator/index.vue`、`README.md`

### 2026-07-22（豆豆色值标注）

- **会话目的**：让每个有色豆豆格子显示色值，方便对照拼豆。
- **完成任务**：
  - 每个主体/描边豆子绘制色值文字（优先 MARD 色号，否则 HEX）
  - 色值在网格线之后绘制，避免被盖住
  - 增加「豆豆上显示色值」开关，默认开启
- **关键决策**：
  - 小格子自动缩小字号；无 MARD 匹配时回退显示 HEX
- **修改文件**：
  - 更新 `src/utils/DrawBeadPattern.ts`、`src/store/modules/generator.ts`
  - 更新 `src/components/ControlPanel.vue`、`src/components/BeadCanvas.vue`
  - 更新 `src/views/generator/index.vue`、`README.md`

### 2026-07-22（逐字垂直对齐）

- **会话目的**：为每个字增加垂直对齐（居顶 / 居中 / 居底）。
- **完成任务**：
  - `CharStyle` 增加 `align` 字段
  - 合成网格时按对齐计算 Y 偏移
  - 控制面板增加对齐切换与「对齐应用到全部」
- **关键决策**：
  - 默认对齐为居中，兼容旧会话数据时自动补齐
  - 预览区用 `align-self` 同步展示对齐效果
- **修改文件**：
  - 更新 `src/utils/TextToPixels.ts`、`src/store/modules/generator.ts`
  - 更新 `src/components/ControlPanel.vue`、`src/views/generator/index.vue`
  - 更新 `src/views/about/index.vue`、`README.md`

### 2026-07-22（负字距 + 文字效果）

- **会话目的**：字间距支持负值叠连，并为每字增加加粗/倾斜/下划线等效果。
- **完成任务**：
  - 字间距范围调整为 -24~24，负值时字符可重叠连接
  - `CharStyle` 增加 `bold` / `italic` / `underline` / `lineThrough`
  - 采样时按样式绘制字体效果，下划线/删除线一并像素化
  - 控制面板增加效果开关与「样式应用到全部」
- **关键决策**：
  - 负字距布局先计算坐标再统一偏移，避免越界
  - 重叠区域后写覆盖先写，便于连笔观感
- **修改文件**：
  - 更新 `src/utils/TextToPixels.ts`、`src/utils/FontOptions.ts`
  - 更新 `src/store/modules/generator.ts`、`src/components/ControlPanel.vue`
  - 更新 `src/views/generator/index.vue`、`README.md`

### 2026-07-22（字间距 + 逐字样式）

- **会话目的**：支持调整字间距，并为每个字单独设置颜色与大小。
- **完成任务**：
  - 新增 `ConvertStyledTextToPixels` 按字采样并横向拼接
  - 图案网格改为每格自带颜色，描边仍用统一描边色
  - Store 增加 `letterSpacing`、`charStyles` 与应用到全部能力
  - 控制面板增加字间距滑杆、字符点选、逐字色号/字号编辑
- **关键决策**：
  - 改文字时自动对齐 `charStyles` 长度，保留已有字的配置
  - 垂直居中对齐不同字号字符
- **修改文件**：
  - 更新 `src/utils/TextToPixels.ts`、`src/utils/DrawBeadPattern.ts`
  - 更新 `src/store/modules/generator.ts`、`src/components/ControlPanel.vue`
  - 更新 `src/components/BeadCanvas.vue`、`src/views/generator/index.vue`
  - 更新 `src/views/about/index.vue`、`README.md`

### 2026-07-22（可选字体）

- **会话目的**：为文字采样增加可切换字体。
- **完成任务**：
  - 新增 `FontOptions` 字体清单与 `document.fonts` 预加载
  - 控制面板增加字体下拉与实时预览
  - Store / 生成器页 / Canvas 贯通 `fontId`
  - Google Fonts 补充宋体、站酷黄油体、毛笔与像素字体
- **关键决策**：
  - 采样前先 `EnsureFontLoaded`，避免未加载时回退系统字体导致预览不准
  - 异步重绘使用 token 丢弃过期结果
- **修改文件**：
  - 新增 `src/utils/FontOptions.ts`
  - 更新 `public/index.html`、`src/store/modules/generator.ts`
  - 更新 `src/components/ControlPanel.vue`、`src/components/BeadCanvas.vue`
  - 更新 `src/views/generator/index.vue`、`src/views/about/index.vue`、`README.md`

### 2026-07-22（方格像素图纸）

- **会话目的**：按参考拼豆图纸，将圆形珠改为方格像素格样式。
- **完成任务**：
  - 绘制改为无间隙方格填充，去掉圆形与高光
  - 叠加每格细线 / 每 10 格加粗的坐标网格
  - 格子足够大时自动绘制 MARD 色号
  - 默认格子尺寸调整为 22px，便于看清色号
- **关键决策**：
  - 视觉对齐常见拼豆图纸：方格、色号、计数网格
  - 空位保留背景色方格，保证整张图为完整像素网格
- **修改文件**：
  - 更新 `src/utils/DrawBeadPattern.ts`、`src/components/BeadCanvas.vue`
  - 更新 `src/components/ControlPanel.vue`、`src/store/modules/generator.ts`
  - 更新 `src/views/about/index.vue`、`README.md`

### 2026-07-22（外轮廓描边豆）

- **会话目的**：按用户反馈，描边改为整块文字/图案外围的可拼豆子，而非单颗珠线框。
- **完成任务**：
  - 新增 `BuildOutlinedPattern`：按切比雪夫距离外扩生成描边豆层
  - 绘制层用描边色填充 outline 格子，主体用珠子色
  - 预览统计区分主体 / 描边 / 合计豆数
  - 控件文案改为「描边宽度 N 豆」
- **关键决策**：
  - 描边宽度单位为豆数（1–5），默认 1 圈
  - 关闭描边时仅绘制主体文字豆
- **修改文件**：
  - 更新 `src/utils/TextToPixels.ts`、`src/utils/DrawBeadPattern.ts`
  - 更新 `src/components/BeadCanvas.vue`、`src/components/ControlPanel.vue`
  - 更新 `src/store/modules/generator.ts`、`src/views/about/index.vue`、`README.md`

### 2026-07-22（MARD 色卡 + 描边修复）

- **会话目的**：珠子/描边颜色改为 MARD 色卡选择，并修复描边看不见的问题。
- **完成任务**：
  - 新增 MARD 291 色卡数据与系列筛选工具
  - 控制面板用色块选择器替换自由取色（珠子色、描边色）
  - 绘制改为「先填充、后描边」两遍流程，描边内缩半线宽避免被相邻珠子覆盖
  - 默认珠子色改为 MARD C8，描边色改为 MARD H7
- **关键决策**：
  - 背景色仍保留自由取色（图纸底色不必受色卡限制）
  - 描边最小线宽保证 ≥1px，粗细范围调整为 1–5px
- **修改文件**：
  - 新增 `src/utils/MardColors.ts`
  - 更新 `src/components/ControlPanel.vue`、`src/utils/DrawBeadPattern.ts`
  - 更新 `src/store/modules/generator.ts`、`src/views/about/index.vue`、`README.md`

### 2026-07-22

- **会话目的**：在空仓库创建 Vue3 + Vite 拼豆豆图纸生成器；页面用 Options API 生命周期实现。
- **完成任务**：
  - 搭建 Vue3 + Vite + TS 工程
  - 实现文字渲染像素图案、描边开关/颜色/粗细、Canvas 预览与 PNG 导出
  - 组件统一使用 Options API（`created`、`mounted`、`beforeUnmount`、`watch`）
- **关键决策**：
  - 技术栈保持 Vue3 + Vite；交互层不用 Composition API，改用 Options API 生命周期
  - 文字经离屏 Canvas 采样后裁剪空白，再绘制为圆形拼豆
  - 预览重绘使用短防抖，保证输入流畅
- **修改文件**：
  - 新增 `package.json`、`vite.config.ts`、`tsconfig*.json`、`index.html`
  - 新增 `src/main.ts`、`src/App.vue`、`src/vite-env.d.ts`、`src/styles/main.css`
  - 新增 `src/components/ControlPanel.vue`、`src/components/BeadCanvas.vue`
  - 新增 `src/utils/TextToPixels.ts`、`src/utils/DrawBeadPattern.ts`
  - 新增 `README.md`

### 2026-07-22（store / router）

- **会话目的**：参考 `ilot-h5-ussd-game-rush` 配置，为当前项目接入 store 与 router。
- **完成任务**：
  - 引入 Vue Router 4、Vuex 4、vuex-persistedstate
  - 按参考项目结构拆分 `src/router`、`src/store`、`src/views`
  - Vite / tsconfig 增加 `@` 路径别名
  - 生成器参数迁移到 `store/modules/generator`
- **关键决策**：
  - 路由用 `import.meta.glob` 自动聚合业务目录配置
  - Store 沿用 root + modules + sessionStorage 持久化模式
  - 页面继续使用 Options API，通过 `mapGetters` / `mapMutations` 连接 Vuex
- **修改文件**：
  - 更新 `package.json`、`vite.config.ts`、`tsconfig.json`、`tsconfig.node.json`、`src/main.ts`、`src/App.vue`、`README.md`
  - 新增 `src/router/**`、`src/store/**`、`src/views/generator/index.vue`、`src/views/about/index.vue`

### 2026-07-22（多环境 + public）

- **会话目的**：参考 ilot 增加开发/测试/生产环境配置，并补齐 `public` 静态资源目录。
- **完成任务**：
  - 新增 `.env.dev` / `.env.test` / `.env.prod`
  - 新增 `public/index.html`、`public/favicon.ico`
  - `vite.config.ts` 接入 `loadEnv`、`base`、`define process.env`、`vite-plugin-html`
  - `package.json` 增加多环境启停与打包脚本
  - 新增 `src/utils/Env.ts` 统一读取环境变量
- **关键决策**：
  - 模式命名与 ilot 对齐：`dev` / `test` / `prod`
  - HTML 模板放到 `public/index.html`，由 `vite-plugin-html` 注入入口
  - 生产构建开启 `drop_console`
- **修改文件**：
  - 新增 `.env.dev`、`.env.test`、`.env.prod`、`public/**`、`src/utils/Env.ts`
  - 更新 `vite.config.ts`、`package.json`、`index.html`、`src/router/index.ts`、`src/App.vue`、`src/vite-env.d.ts`、`README.md`

### 2026-07-22（Cloudflare 白屏修复）

- **会话目的**：排查 https://fuse-beads.pages.dev/ 发布后白屏问题。
- **完成任务**：
  - 定位到生产 `VITE_BASE_ROUTE=/fuse-beads` 导致 JS/CSS 请求错误路径
  - 将 `.env.prod` / `.env.test` 的 `VITE_BASE_ROUTE` 改为 `/`
  - 新增 `public/_redirects`，支持 Vue Router history 回退
- **关键决策**：
  - Cloudflare Pages 挂在域名根路径时，`base` 必须为 `/`
- **修改文件**：
  - 更新 `.env.prod`、`.env.test`、`README.md`
  - 新增 `public/_redirects`
