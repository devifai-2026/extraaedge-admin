// Serialization helpers shared by WorkflowBuilder + EditAutomationWorkflow.
//
// The visual builder edits a simplified IF/THEN model. We translate that into
// the backend's node/edge graph (see extraaedge-server workflow-executor.js):
//   - a `trigger` node carrying the IF condition (config_json.condition)
//   - one `action` node carrying the THEN action(s) (config_json.actions[])
//   - a single edge trigger -> action
//
// Supported action types (executor): assign, send_message (email/sms only —
// WhatsApp automation is DISABLED), schedule_follow_up, add_score, set_field,
// add_tag.

// Working automated send channels. WhatsApp is intentionally excluded — the
// executor skips whatsapp send_message steps (ban risk), so we never offer it
// as an automated channel here.
export const SEND_CHANNELS = [
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" }
];

// Build the { nodes, edges } payload for create/update from the builder's form
// state. Uses stable local ids ("trigger", "action") so the backend can wire
// the edge; the server maps these to real uuids on insert.
export function buildGraph({ condition, action }) {
  const nodes = [
    {
      id: "trigger",
      type: "trigger",
      config_json: { condition: condition || {} },
      position_x: 80,
      position_y: 80
    },
    {
      id: "action",
      type: "action",
      config_json: { actions: action ? [action] : [] },
      position_x: 80,
      position_y: 240
    }
  ];
  const edges = [{ from_node_id: "trigger", to_node_id: "action" }];
  return { nodes, edges };
}

// Inverse of buildGraph — pull the first trigger's condition and the first
// action node's first action out of a loaded workflow's nodes[].
export function parseGraph(nodes = []) {
  const trigger = nodes.find((n) => n.type === "trigger") || null;
  const actionNode = nodes.find((n) => n.type === "action") || null;
  const condition = trigger?.config_json?.condition || {};
  const actions = actionNode?.config_json?.actions;
  const action =
    (Array.isArray(actions) && actions[0]) ||
    (actionNode && !actions ? actionNode.config_json : null) ||
    null;
  return { condition, action };
}
