function normalizeSignalText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

const PARTNERSHIP_PATTERN = /\b(partner|partnership|agreement|deal|distribution deal|joint venture|integrates with|rollout with)\b/i;
const ACQUISITION_PATTERN = /\b(acquires|acquisition|acquire|merger|merges with|buyout|takes stake)\b/i;
const INFRASTRUCTURE_NOUN_PATTERN = /\b(data center|datacenter|cluster|gpu|gpus|accelerator|accelerators|chip|chips|silicon|server racks?|rack capacity|compute capacity|training capacity|inference capacity|supercomputer|supercomputing|foundry|fab)\b/i;
const INFRASTRUCTURE_ACTION_PATTERN = /\b(build|builds|building|expand|expands|expanded|open|opens|opened|add|adds|added|reserve|reserves|reserved|lease|leases|leased|deploy|deploys|deployed|scale|scales|scaled|commit|commits|committed|procure|procures|procured|ramp|ramps|ramped|manufactur|fabricat|capacity|buildout|supply)\b/i;
const INFRASTRUCTURE_COMPOUND_PATTERN = /\b(training cluster|inference capacity|compute capacity|data center capacity|data center silicon|server racks?|gpu cluster|chip supply|compute buildout)\b/i;
const NEGATED_INFRASTRUCTURE_PATTERN =
  /\b(no|not|without|never)\b[^.]{0,48}\b(data center|datacenter|cluster|gpu|gpus|chip|chips|server racks?|compute capacity|training capacity|inference capacity)\b|\bdoes not describe\b[^.]{0,48}\b(data center|datacenter|cluster|gpu|gpus|chip|chips|server racks?|compute capacity|training capacity|inference capacity)\b/i;

export function hasPartnershipSignal(text: string) {
  return PARTNERSHIP_PATTERN.test(normalizeSignalText(text));
}

export function hasAcquisitionSignal(text: string) {
  return ACQUISITION_PATTERN.test(normalizeSignalText(text));
}

export function hasInfrastructureSignal(text: string) {
  const normalized = normalizeSignalText(text);

  if (NEGATED_INFRASTRUCTURE_PATTERN.test(normalized)) {
    return false;
  }

  if (INFRASTRUCTURE_COMPOUND_PATTERN.test(normalized)) {
    return true;
  }

  return INFRASTRUCTURE_NOUN_PATTERN.test(normalized) && INFRASTRUCTURE_ACTION_PATTERN.test(normalized);
}
