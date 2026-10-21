// SPDX-License-Identifier: AGPL-3.0-only
import{patchSource as builtinPatch}from'../graph-builtin/patch-source.mjs';export function patchSource(files,observer,options){return builtinPatch(files,observer,{...options,packedRelation:options.varintRelation});}
