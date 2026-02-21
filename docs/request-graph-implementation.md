# 请求图 (Request Graph) 实现原理

## 概述

请求图用于可视化 LLM 请求之间的依赖关系，采用类似 Git 分支图的布局方式。采用贪心算法优化列分配，最大化空间利用率。

## 1. 核心数据流

```
data.json (requests with parent_id)
  │
  ▼
buildRequestTree()     // 根据 parent_id 构建树森林
  │
  ▼
buildFlatNodes()       // 两阶段布局:
  │                    //   1. assignBranchIds: 分配 branchId
  │                    //   2. 贪心列分配: branchId → column
  ▼
buildLaneSpans()       // 计算每个分支的连接线垂直范围
  │
  ▼
SVG渲染               // ConnectorLayer (连接线) + GraphRow[] (节点)
```

---

## 2. 按列布局模型

### 2.1 布局概念

整个图分为 **行(Row)** 和 **列(Column)** 两个维度：

- **行**: 按时间戳排序，每个请求占一行，越早的请求在越上面
- **列**: 表示分支，通过贪心算法动态分配，时间上不重叠的分支可以复用同一列

### 2.2 两阶段列分配

**阶段一：分配 branchId**
- 每个逻辑分支分配唯一的 `branchId`
- 最大子树继承父节点的 `branchId`
- 其他子树分配新的 `branchId`

**阶段二：贪心列分配**
- 计算每个分支的行范围 `[startRow, endRow]`
- 按 `branchId` 顺序遍历分支
- 为每个分支分配最左侧不冲突的列

### 2.3 布局示意图

```
阶段一 (每分支独占一列):      阶段二 (优化布局, 复用列):

     列0    列1    列2              列0    列1
      ●──────\                       ●──────┐      req-1
      │      │                       │      │
      │      ●                       │      ●      req-2 (分支A)
      │                              │     
      ●                              ●             req-3
      │                              │
      ●─────────────┐                ●──────┐      req-4
      │             │                │      │
      │             ●                │      ●      req-5 (分支B, 复用列1)
      │             │                │      │

分支A和B时间上不重叠，             分支B复用了分支A的列
浪费了水平空间
```

### 2.4 列分配规则

**核心原则：较大的子树保留原分支，较小的分支分配新 branchId，然后贪心分配列**

1. **孤立节点**: 无父无子的请求，全部放在列0，`branchId = -1`，不画连接线
2. **多节点树**: 列从1开始分配（如果有孤立节点）或从0开始
3. **分叉处理**:
   - 计算每个子节点的子树大小（包含自身+所有后代）
   - 按子树大小**降序**排序
   - 第一个（最大子树）继承父节点的 `branchId`
   - 其余子节点分配新 `branchId`，标记为 `isNewBranch`
4. **贪心列分配**:
   - 按 `branchId` 顺序处理每个分支
   - 为每个分支找到最小的不冲突列
   - 冲突检测：行范围是否重叠

---

## 3. 坐标系统详解

### 3.1 常量定义

```typescript
const ROW_HEIGHT = 48;   // 每行高度 (像素)
const COL_WIDTH = 20;    // 每列宽度 (像素)
const NODE_R = 5;        // 节点圆点半径 (像素)
const LEFT_PAD = 14;     // 左边距 (像素)
```

### 3.2 坐标计算函数

```typescript
// 列号 → X坐标 (节点圆心的水平位置)
function colX(col: number): number {
  return LEFT_PAD + col * COL_WIDTH;
}

// 行号 → Y坐标 (节点圆心的垂直位置，在行的中间)
function rowY(row: number): number {
  return row * ROW_HEIGHT + ROW_HEIGHT / 2;
}
```

### 3.3 坐标计算图解

```
      ◀─────────────── svgWidth ───────────────▶
      │                                        │
      │◀─LEFT_PAD─▶│◀COL_WIDTH▶│◀COL_WIDTH▶│   │
      │    14px    │   20px    │   20px    │   │
      │            │           │           │   │
┬ ─ ─ ┼ ─ ─ ─ ─ ─ ─┼─ ─ ─ ─ ─ ─┼─ ─ ─ ─ ─ ─┼ ─ ┤ ─ ─ ─ ┬
│     │            │           │           │   │       │
│     │     ●      │     ●     │     ●     │   │       │ ROW_HEIGHT
│     │   col=0    │   col=1   │   col=2   │   │       │   = 48px
│     │  x=14px    │  x=34px   │  x=54px   │   │       │
┴ ─ ─ ┼ ─ ─ ─ ─ ─ ─┼─ ─ ─ ─ ─ ─┼─ ─ ─ ─ ─ ─┼ ─ ┤ ─ ─ ─ ┴
      │            │           │           │   │
      │     ●      │           │           │   │  row=1, y=72px
      │            │           │           │   │  (48 + 24 = 72)
─ ─ ─ ┼ ─ ─ ─ ─ ─ ─┼─ ─ ─ ─ ─ ─┼─ ─ ─ ─ ─ ─┼ ─ ┤ ─ ─ ─ ─
      │            │           │           │   │

节点圆心位置:
  row=0, col=0 → (14, 24)     // 24 = 48/2
  row=0, col=1 → (34, 24)     // 34 = 14 + 20
  row=1, col=0 → (14, 72)     // 72 = 48 + 24
  row=2, col=2 → (54, 120)    // 54 = 14 + 40, 120 = 96 + 24
```

### 3.4 SVG 总宽度计算

```typescript
const maxCol = Math.max(...flat.map((n) => n.column), 0);
const svgWidth = LEFT_PAD * 2 + (maxCol + 1) * COL_WIDTH;

// 示例: 最大列号为2
// svgWidth = 14 * 2 + 3 * 20 = 28 + 60 = 88px
```

---

## 4. 连接线渲染

### 4.1 LaneSpan 概念

每个分支（branchId）维护一个 `LaneSpan`，记录该分支竖线的起止 Y 坐标和所在列：

```typescript
interface LaneSpan {
  openY: number;   // 竖线起点 (最小Y)
  endY: number;    // 竖线终点 (最大Y)
  column: number;  // 该分支所在的列
}
```

**注意**：LaneSpan 按 `branchId` 索引而非按 `column`，因为贪心优化后同一列可能包含多个时间上不重叠的分支。

### 4.2 竖线 (Lane Lines)

连接同一分支上连续的节点：

```
     分支A (branchId=1, column=1)
      │
      ●  ← openY (第一个节点的Y，或S曲线终点)
      │
      │  ← 竖线
      │
      ●  ← endY (最后一个节点的Y)
```

### 4.3 S曲线 (分叉连接)

当节点标记为 `isNewBranch` 时，从父节点画一条 S 曲线到该节点的列：

```
父节点 (px, py)
      ●
      │
      │  ← 曲线起点
       ╲
        ╲  ← 三次贝塞尔曲线
         ╲
          │  ← 曲线终点 (cx, endY)
          │
          ●  子节点 (cx, nodeY)
```

**贝塞尔曲线公式**:
```typescript
const dx = Math.abs(cx - px);           // 水平距离
const curveH = Math.max(ROW_HEIGHT, dx * 0.75);  // 曲线高度
const endY = Math.min(py + curveH, nodeY);  // 确保不超过子节点位置
const midY = py + (endY - py) / 2;      // 控制点Y

// SVG path: M起点 C控制点1 控制点2 终点
const d = `M ${px} ${py} C ${px} ${midY} ${cx} ${midY} ${cx} ${endY}`;
```

### 4.4 连接线示意

```
      列0         列1
       │           │
       ● (px,py)   │
       │╲          │
       │ ╲         │
       │  ╲        │
       │   ╲───────● (cx, endY) ← 曲线终点，竖线从这里开始
       │           │
       ●           ● (cx, nodeY) ← 实际子节点位置
       │           │
       ●           │
```

---

## 5. 关键数据结构

### 5.1 FlatNode

展平后的节点，用于渲染：

```typescript
interface FlatNode {
  id: string;           // 请求ID
  request: Request;     // 原始请求数据
  column: number;       // 列号 (决定X坐标，由贪心算法分配)
  branchId: number;     // 分支ID (逻辑分支标识，-1表示孤立节点)
  parentId: string | null;  // 父节点ID
  isNewBranch: boolean; // 是否是新分支 (需要画S曲线)
  isIsolated: boolean;  // 是否孤立节点 (不画连接线)
}
```

### 5.2 RequestTreeNode

树结构节点：

```typescript
interface RequestTreeNode {
  request: Request;
  children: RequestTreeNode[];
}
```

---

## 6. 算法流程

### 6.1 buildRequestTree

```
输入: Request[] (带 parent_id)
输出: RequestTreeNode[] (森林)

1. 创建 id → node 映射表
2. 遍历所有请求:
   - parent_id 为 null → 加入 roots
   - parent_id 存在 → 加入父节点的 children
3. 递归排序每层 children (按时间戳)
4. 返回 roots
```

### 6.2 buildFlatNodes

```
输入: RequestTreeNode[] (森林)
输出: FlatNode[] (按时间排序)

阶段1: 分配 branchId
  1. 分离孤立节点和多节点树
  2. 孤立节点 → branchId=-1, column=0, isIsolated=true
  3. 多节点树:
     a. 计算每个子树的大小 (递归 + 缓存)
     b. DFS遍历，分配 branchId:
        - 最大子树继承父 branchId
        - 其他子树分配新 branchId
  4. 按时间戳排序所有节点

阶段2: 贪心列分配
  5. 聚合每个分支的行范围:
     - startRow: 若 isNewBranch 则取父节点行，否则取该分支最小行
     - endRow: 该分支最大行
  6. 按 branchId 顺序遍历:
     - 从最小可用列开始
     - 找到第一个不冲突的列 (行范围不重叠)
     - 将该分支所有节点的 column 设为此列
```

### 6.3 buildLaneSpans

```
输入: FlatNode[]
输出: Map<branchId, LaneSpan>

遍历每个节点:
  - 跳过孤立节点 (branchId = -1)
  - 如果是新分支: openY = 父节点Y + 曲线高度 (不超过节点Y)
  - 否则: 扩展现有 span 的范围
  - 更新 endY 为最大值
  - 记录该分支的 column
```

---

## 7. 渲染层级

```
z-index 1: ConnectorLayer (SVG)
           ├── 竖线 <line> (每个 branchId 一条)
           └── S曲线 <path>

z-index 2: GraphRow[] (每行一个)
           ├── 节点圆点 <circle>
           └── 请求信息 (摘要、模型、耗时)
```

---

## 8. 完整示例

### 输入数据

```json
{
  "requests": [
    { "id": "req-1", "parent_id": null,    "timestamp": 1000 },
    { "id": "req-2", "parent_id": "req-1", "timestamp": 2000 },
    { "id": "req-3", "parent_id": "req-1", "timestamp": 2500 },
    { "id": "req-4", "parent_id": "req-3", "timestamp": 3000 },
    { "id": "req-5", "parent_id": "req-3", "timestamp": 3500 }
  ]
}
```

### 树结构

```
req-1
├── req-2 (子树大小=1)
└── req-3 (子树大小=3)
    ├── req-4 (子树大小=1)
    └── req-5 (子树大小=1)
```

### branchId 分配

```
req-1: branchId=0 (根)
  排序子节点: [req-3(3), req-2(1)]
  req-3: branchId=0 (最大子树，继承)
  req-2: branchId=1 (新分支)

req-3: branchId=0
  排序子节点: [req-4(1), req-5(1)] (大小相同，保持原顺序)
  req-4: branchId=0 (继承)
  req-5: branchId=2 (新分支)
```

### 贪心列分配

```
按时间戳排序后的行号:
  row 0: req-1 (branchId=0)
  row 1: req-2 (branchId=1)
  row 2: req-3 (branchId=0)
  row 3: req-4 (branchId=0)
  row 4: req-5 (branchId=2)

分支行范围:
  branchId=0: [0, 3]
  branchId=1: [0, 1] (startRow=父节点row=0)
  branchId=2: [2, 4] (startRow=父节点row=2)

贪心分配:
  branchId=0 → column=0 (列0空闲)
  branchId=1 → column=1 (列0被[0,3]占用)
  branchId=2 → column=1 (列0被[0,3]占用, 列1的[0,1]与[2,4]不重叠!)
```

### 最终布局

```
传统布局:              优化后布局:

  列0    列1    列2      列0    列1
   │      │      │        │      │
   ●──────┐      │        ●──────┐        req-1
   │      │      │        │      │
   │      ●      │        │      ●        req-2 (branchId=1)
   │      │      │        │      │
   ●──────┼──────┐        ●──────┐        req-3
   │      │      │        │      │
   ●      │      │        ●      │        req-4
   │      │      │        │      │
   │      │      ●        │      ●        req-5 (branchId=2, 复用列1!)
```

### 坐标计算

```
req-1: row=0, col=0 → (14, 24)
req-2: row=1, col=1 → (34, 72)
req-3: row=2, col=0 → (14, 120)
req-4: row=3, col=0 → (14, 168)
req-5: row=4, col=1 → (34, 216)  // 注意: 使用列1而非列2

svgWidth = 14*2 + 2*20 = 68px    // 比传统布局节省20px
svgHeight = 5 * 48 = 240px
```

---

## 9. 代码位置

| 模块 | 文件 | 行号 |
|------|------|------|
| 树构建 | `src/utils/treeLayout.ts` | 12-55 |
| branchId 分配 | `src/components/sidebar/RequestGraph.tsx` | 41-74 |
| 贪心列分配 | `src/components/sidebar/RequestGraph.tsx` | 114-156 |
| 连接线渲染 | `src/components/sidebar/RequestGraph.tsx` | 220-285 |
| 节点行渲染 | `src/components/sidebar/RequestGraph.tsx` | 322-419 |
| 主组件 | `src/components/sidebar/RequestGraph.tsx` | 431-457 |

---

## 10. 性能特征

| 操作 | 时间复杂度 | 空间复杂度 |
|------|-----------|-----------|
| buildRequestTree | O(n log n) | O(n) |
| getSubtreeSize | O(n) | O(n) 缓存 |
| assignBranchIds | O(n log n) | O(n) |
| 贪心列分配 | O(b × c) | O(b) b=分支数, c=列数 |
| buildLaneSpans | O(n) | O(b) b=分支数 |
| 总体 | O(n log n) | O(n) |

实测: 1000个请求 < 100ms
