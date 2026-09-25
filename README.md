# hex-landlords

TypeScript 斗地主项目，包含规则引擎、确定性单机演示，以及浏览器单机 MVP。浏览器版本由玩家 A 对战两个本地 AI，可完成叫分、出牌、三手 Run 和重开。

## 安装与运行

```sh
npm install
npm run dev
```

Vite 会打印本地地址。开发服务器默认使用 5173 端口；端口被占用时会自动选择可用端口。

## 检查

```sh
npm test
npm run build
```

## 命令行演示

```sh
npm run demo
```

Run 使用固定种子 `2026`，便于复现发牌、叫分、出牌和结算过程。规则入口为 `src/domain/game.ts` 的 `dispatch(state, command)`；创建 Run 使用 `src/domain/setup.ts` 的 `createRun({ seed })`。对外提供状态时使用 `viewForPlayer(state, playerId)`，不要直接发送完整内部状态。
