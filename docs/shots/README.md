# 截图放置说明

命名即页面名，模型靠文件名判断这是哪一屏。

```
docs/shots/
├─ paper/      纸感皮肤
│   ├─ today.png
│   ├─ record.png
│   ├─ trends.png
│   └─ profile.png
├─ ledger/     账本皮肤（同四页）
│   ├─ today.png
│   ├─ record.png
│   ├─ trends.png
│   └─ profile.png
└─ scenes/     三种用户场景
    ├─ empty.png        全新安装、零数据
    ├─ no-training.png  不健身模式
    └─ bulking.png      增肌目标
```

要求：

- 真机原图或至少 360×800，不要缩放成模糊小图。
- 同一皮肤的四周截图用同一台设备、同一系统字号，否则对比失真。
- 场景截图额外注明：手机型号 + 系统字号（写在这里即可，别写进图片）。

## 已采集

| 皮肤 | 设备 | 分辨率 | 系统字号 | 采集日期 |
|---|---|---|---|---|
| 纸感 | 2510DRK44C | 1156×2510 | 默认 | 2026-10-26 |
| 账本 | 2510DRK44C | 1156×2510 | 默认 | 2026-10-26 |

已采：paper/{today,record,trends,profile}.png、ledger/{today,record,trends,profile}.png

未采：scenes/ 下三张（空数据、不健身、增肌）——都会改变本机数据，需先确认。
