# hex-landlords

TypeScript 斗地主规则引擎，当前提供确定性单机三手演示。

## 运行

```sh
npm install
npm test
npm run build
npm run demo
```

Run 使用固定种子 `2026`，便于复现发牌、叫分、出牌和结算过程。规则入口为 `src/domain/game.ts` 的 `dispatch(state, command)`；创建 Run 使用 `src/domain/setup.ts` 的 `createRun({ seed })`。对外提供状态时使用 `viewForPlayer(state, playerId)`，不要直接发送完整内部状态。
