import {SELECTED_STAGED_MODE} from '../engine/staged-selected.js';
import {runStagedRequest} from './staged-controller.js';
export const runSelectedStagedRequest=(input,options={},dependencies={})=>runStagedRequest(input,{...options,mode:SELECTED_STAGED_MODE},dependencies);
