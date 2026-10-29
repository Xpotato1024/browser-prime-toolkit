// SPDX-License-Identifier: AGPL-3.0-only
// Local evaluation entry; not adopted by site/index.js or the release adapter.
import {createRusqsieveRunner} from '../selected-wide/runner.js';
import {validateSiqs400Input,validateSiqs400Configuration} from './contracts.js';
import {siqs400WorkerSource} from './worker-source.js';
export {selectResourcePlan,validateResourcePlan} from '../selected-wide/policy.js';
export const runSiqs400=createRusqsieveRunner({inputValidator:validateSiqs400Input,
 sourceForCap:siqs400WorkerSource,configurationValidator:validateSiqs400Configuration});
