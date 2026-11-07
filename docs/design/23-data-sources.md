# 数据源评估（2026-11-07）

目标：给「食品热量参考库」和「动作说明」找可长期使用、许可清楚的数据来源。
判断标准：许可可再分发 ＞ 字段够用 ＞ 体积可控；许可不清的一律不进仓库。

| 项目 / 数据 | 内容 | 许可 | 结论 |
|---|---|---|---|
| [USDA FoodData Central SR Legacy](https://fdc.nal.usda.gov/) | 食材营养（每 100 g，含 fdcId） | 美国联邦数据，公有领域 | **采用**。1.3.12 新增 27 条（肉类、水产、坚果、豆类、水果等），逐条记录 fdcId |
| [Open Food Facts](https://world.openfoodfacts.org/) | 包装食品条码与营养 | ODbL（署名 + 相同方式共享） | 已在用：只在线查询、页面已署名，不批量入库 |
| [Sanotsu/china-food-composition-data](https://github.com/Sanotsu/china-food-composition-data) | 《中国食物成分表（第 6 版）》JSON，1677 条，含中英文名 | **仓库无 LICENSE**，且数据由受版权书籍截图识别 | **不采用**。可作人工抽检对照，不复制进仓库 |
| [yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db) | 876 个动作，英文步骤、肌群、器械、图片 | Unlicense（公有领域） | **备选**。字段够用，但需中文名与要点翻译，下一轮可做 |
| [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset) | 1,324 个动作，6 语说明 | NOASSERTION；媒体 © Gym visual | **不采用**。文字许可不明，媒体不可再分发 |

## 轻衡自己的数据

- 食材：`tools/usda-catalogue.json`（中文名 + 别名 + 分类 + 基准 + 常见份量 + fdcId），`node tools/build-food-library.mjs` 生成 `app/src/main/assets/food-models.js`；改动只动 catalogue。
- 混合菜（炒菜、面食）：USDA 没有对应条目，保留 `mixed_dish` 的示例估算，不冒充实测。
- 动作说明：`app/src/fragments/65-exercise-guide.fragment.js`，2026-11-07 从 30 条扩到 91 条；1.3.13 按 free-exercise-db（Unlicense）的名称与肌群覆盖补 30 条常见器械/绳索动作，中文名称与要点自写，不复制其媒体或英文原文。
- 动作处方（组次/RPE）：`training-principles.js`，来自公开视频与指南，带来源等级；不引入第三方动作库的媒体文件。

## 许可落点

- USDA / Unlicense 数据：可再分发，保留出处与 fdcId。
- ODbL：在线查询可，批量入库需同许可发布，因此不做。
- 无许可或 NOASSERTION：只做人工对照，不复制。
