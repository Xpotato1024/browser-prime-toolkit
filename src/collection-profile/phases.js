// SPDX-License-Identifier: AGPL-3.0-only
export const COLLECTION_PHASES=Object.freeze([
 'Context準備','familyのA選択','CRT/B初期係数','初期roots/Bainv',
 'polyのC係数','score計画・初期化','score kernel（dense/疎/linear）','候補走査',
 'resieve','候補値復元・試し割り','残余分類','受理relation生成',
 'Gray B更新','SIMD root更新','packet化','collector merge'
]);
