# GameHub - 网页游戏门户

React + Vite + Ant Design v6 构建的网页游戏聚合平台。

门户层（首页 + 详情页）使用 React 单页应用实现，各游戏子项目保持原有 HTML/JS/CSS 实现，通过 iframe 嵌入。

## 技术栈

- React 19
- Ant Design 6
- React Router v7
- Vite 6

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 生产构建
npm run build

# 预览构建产物
npm run preview
```

## 目录结构

```
gamehub/
├── public/
│   └── games/              # 游戏子项目（独立 HTML 游戏，构建时原样复制）
│       ├── alcohol/
│       ├── feed-fish/
│       ├── fishing/
│       └── ...
├── src/
│   ├── main.jsx            # 应用入口
│   ├── App.jsx             # 根组件 + 路由配置
│   ├── components/         # React 组件
│   ├── pages/              # 页面组件（HomePage / GamePage）
│   ├── data/               # 游戏数据模块
│   └── styles/             # 全局样式
├── index.html              # Vite 入口 HTML
├── vite.config.js          # Vite 配置
└── package.json
```
