import React from "react";
import WorkflowBuilder from "./WorkflowBuilder";

// Edit an existing automation workflow. We reuse the wired WorkflowBuilder in
// edit mode — it loads the workflow's graph (nodes/edges) via workflowsApi.get,
// hydrates the IF/THEN form, and saves via workflowsApi.update. Passing a
// synthetic `category` keeps the builder's title + THEN description meaningful
// using the workflow's own category name.
const EditAutomationWorkflow = ({ workflow, onBack, onSave, onCancel }) => {
  if (!workflow?.id) return null;

  const category = {
    id: workflow.category_id || "edit",
    title: workflow.category_name
      ? `Edit ${workflow.category_name}`
      : `Edit ${workflow.name || "workflow"}`,
    // preview drives the THEN helper copy; default to the generic "immediate".
    preview: "immediate"
  };

  return (
    <WorkflowBuilder
      workflowId={workflow.id}
      category={category}
      onBack={onBack}
      onCancel={onCancel || onBack}
      onSave={onSave}
    />
  );
};

export default EditAutomationWorkflow;
