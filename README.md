# WX2XHS

**微信公众号文章 → 小红书图文卡片转换器**

[English](#english) | [中文](#中文)

---

## 中文

### 简介

WX2XHS 是一个将微信公众号长文一键转换为小红书图文卡片的工具。支持手动分页、Markdown 渲染、富文本编辑，一键导出为图片压缩包（3:4 竖图，1080×1440）。

### ✨ 功能特点

- **手动分页控制** - 使用 `---` 在任意位置强制分页，完全掌控每张卡片的内容
- **Markdown 渲染** - 支持标题（# ## ###）、**粗体**、*斜体*、~~删除线~~
- **高亮语法** - 使用 `==文字==` 添加高亮效果（类似 Obsidian）
- **实时预览** - 右侧实时显示 1080×1440（3:4）小红书卡片效果
- **一键去空行** - 工具栏按钮快速清理空白行
- **卡片同步定位** - 点击卡片自动跳转到原文对应位置
- **批量导出** - 所有卡片一键打包为 ZIP 图片压缩包

### 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

### 📖 使用方法

1. 在左侧文本框粘贴微信公众号文章
2. 使用 `---`（独占一行）标记分页位置
3. 点击「生成分页」预览效果
4. 调整后点击「导出图片」下载 ZIP 压缩包

### 🛠 技术栈

- React 19 + TypeScript
- Vite 7 + Tailwind CSS 4
- react-markdown + remark-gfm
- html2canvas + JSZip

---

## English

### Introduction

WX2XHS is a tool that converts WeChat articles into Xiaohongshu (Little Red Book) image cards. It supports manual pagination, Markdown rendering, rich text editing, and one-click export to a ZIP archive (3:4 portrait, 1080×1440).

### ✨ Features

- **Manual Pagination** - Use `---` to force page breaks anywhere
- **Markdown Rendering** - Supports headings (# ## ###), **bold**, *italic*, ~~strikethrough~~
- **Highlight Syntax** - Use `==text==` for highlights (Obsidian-style)
- **Live Preview** - Real-time 1080×1440 (3:4) card preview
- **Remove Empty Lines** - One-click toolbar button to clean up
- **Card-to-Source Sync** - Click a card to jump to its source text
- **Batch Export** - Export all cards as a ZIP of PNG images

### 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

### 📖 Usage

1. Paste your WeChat article in the left text area
2. Use `---` (on its own line) to mark page breaks
3. Click "生成分页" (Generate) to preview cards
4. Click "导出图片" (Export) to download as ZIP

### 🛠 Tech Stack

- React 19 + TypeScript
- Vite 7 + Tailwind CSS 4
- react-markdown + remark-gfm
- html2canvas + JSZip

---

## License

MIT
