# 轻衡

**每一天，轻一点。** 一本只存在你手机里的健康账：饮食、训练、身体三栏记在一处，断网也能用，不上传任何记录。

![Version](https://img.shields.io/badge/version-1.5.12-informational) ![Tests](https://img.shields.io/badge/tests-109%20%2F%20109-green) ![MinSdk](https://img.shields.io/badge/minSdk-26-blue) ![TargetSdk](https://img.shields.io/badge/targetSdk-35-blue) ![APK](https://img.shields.io/badge/APK-659%20KB-lightgrey) ![License](https://img.shields.io/badge/license-%E7%A6%81%E6%AD%A2%E8%BD%AC%E5%94%AE-critical)

[**展示页**](https://dustsanchen.github.io/qingheng/) · [**下载最新安装包**](https://github.com/dustSanchen/qingheng/releases/latest) · [**更新记录**](https://github.com/dustSanchen/qingheng/releases)

<table>
<tr>
<td align="center"><img src="site/shots/today.jpg" width="210" alt="今天页：能量环、剩余额度与今日体检"><br><sub>今天 · 一屏看完怎么吃</sub></td>
<td align="center"><img src="site/shots/log.jpg" width="210" alt="训练日志：一组一行，次数与负重同排"><br><sub>训练 · 一组一行</sub></td>
<td align="center"><img src="site/shots/chat.jpg" width="210" alt="问答页：先给依据再给动作"><br><sub>问答 · 先依据后动作</sub></td>
<td align="center"><img src="site/shots/trends.jpg" width="210" alt="趋势页：按真实测量日期连线"><br><sub>趋势 · 只连实测点</sub></td>
</tr>
</table>

## 它解决什么问题

多数健康 App 要么把记录做成表格，要么把建议做成口号。轻衡只做两件事：**让记录足够短**、**让结论有出处**。

- 记一餐：说一句「米饭 100 克、鸡胸 150 克」就能算，数字跟着输入实时变；本地食品库常年可用，常吃的一餐一键复制。
- 记训练：一组一行，10 次 × 60 kg 写在同一行，容量立刻看得见；组间休息按动作给时长，勾完就自动开始。
- 看结论：热量区间、蛋白缺口、本周容量、体重趋势——缺数据就写缺，不补零、不编数。
- 要建议：先给依据，再给行动；不诊断、不开处方、不推荐极端节食。

## 五页功能地图

| 页面 | 能做什么 |
|---|---|
| **今天** | 能量环与三大宏量、剩余额度、今日体检（四项加权，接近/偏离分档）、「下一步」单一主行动、今日记录按餐次折叠 |
| **记录** | 饮食：拍照 / 相册 / 一句话估算，预览确认后入档，本地食品库、一键复制一餐；训练：本周容量与概览、周计划、今日顺序、逐组记录与组间休息、课后总结；身体：体重 + 睡眠一次保存 |
| **问答** | 流式回答、联网检索开关、按天回看、收藏与搜索、拍照提问；发送前可展开核对将发送的数据 |
| **趋势** | 体重按真实测量日期绘制、不插值；上周回看；饮食、训练与体重三块面板 |
| **我的** | 身体档案与目标、AI 模型与密钥（含用量与余额）、提醒与每日建议、偏好与记忆、外观与餐次时间、数据管理 |

## 数据在哪

- 全部记录存在本机（`state.json` + SQLite 镜像），没有账号、没有云同步、没有服务端。
- 断网可用；联网只在你主动提问或让模型估一餐时发生。
- 导出的备份是明文 JSON，放在你自己选的位置。

## AI 是可选的

模型连接是可选项：填自己的 key（存在系统 Keystore），或干脆不填——饮食、训练、趋势、体检都能本地算。
不填 key 时，餐食估算走本地食品库；问答页会说明「还没连接模型」。

## 安装

1. 到 [Releases](https://github.com/dustSanchen/qingheng/releases/latest) 下载 `qingheng-<版本>.apk`。
2. 安装前可核对签名：

```powershell
apksigner verify --print-certs qingheng-1.5.08.apk
# 期望 SHA-256: b23aba9a2955e620dad5453c15a879ffab3ca4ad90a3e5b1b63beb5f55fab1ac
```

3. 首次打开只有两项权限：通知与精确闹钟；其余（相机/相册、文件读写）都在用到时再问。

## 版本与测试

当前 1.5.08（versionCode 508），109 项自动化测试全绿。版本号由 `tools/sync-version.mjs` 一处同步到源码、构建脚本与测试，禁止手改。

## 许可

个人作品，按 [LICENSE](LICENSE) 授权：可阅读、可自用；修改后再发布、转售不在授权范围内。

作者：Sanchen
