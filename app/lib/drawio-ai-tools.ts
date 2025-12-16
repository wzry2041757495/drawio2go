import { tool } from "ai";

import {
  executeDrawioEditBatch,
  executeDrawioRead,
} from "./drawio-xml-service";
import { executeToolOnClient } from "./tool-executor";
import {
  drawioEditBatchInputSchema,
  drawioOverwriteInputSchema,
  drawioReadInputSchema,
} from "./schemas/drawio-tool-schemas";
import type { ReplaceXMLResult } from "@/app/types/drawio-tools";
import type { ToolExecutionContext } from "@/app/types/socket";
import { validateXMLFormat } from "./drawio-xml-utils";
import { AI_TOOL_NAMES, CLIENT_TOOL_NAMES } from "@/lib/constants/tool-names";

const { DRAWIO_READ, DRAWIO_EDIT_BATCH, DRAWIO_OVERWRITE } = AI_TOOL_NAMES;
const { REPLACE_DRAWIO_XML } = CLIENT_TOOL_NAMES;

function requireContext(
  context: ToolExecutionContext | undefined,
): ToolExecutionContext {
  const projectUuid = context?.projectUuid?.trim();
  const conversationId = context?.conversationId?.trim();
  const chatRunId =
    typeof context?.chatRunId === "string" ? context.chatRunId.trim() : "";

  if (!projectUuid || !conversationId) {
    throw new Error("无法获取项目上下文");
  }

  return {
    projectUuid,
    conversationId,
    chatRunId: chatRunId || undefined,
    abortSignal: context?.abortSignal,
  };
}

function createDrawioReadTool(getContext: () => ToolExecutionContext) {
  return tool({
    description: `Read DrawIO diagram content. Supports three query modes:

**Modes (choose one):**
1. **ls mode** (default): List all mxCells with summary info
   - Use \`filter\` to show only "vertices" (shapes) or "edges" (connectors)
   - Returns: id, type, attributes, matched_xpath for each cell
2. **id mode**: Query by mxCell ID (fastest for known elements)
   - Accepts single string or array of strings
   - Example: \`{ "id": "node-1" }\` or \`{ "id": ["node-1", "node-2"] }\`
3. **xpath mode**: XPath expression for complex queries
   - Example: \`{ "xpath": "//mxCell[@vertex='1']" }\`

**Returns:** Each result includes \`matched_xpath\` field for use in subsequent edit operations.

**Best Practice:** Use this tool before editing to understand current diagram state.`,
    inputSchema: drawioReadInputSchema.optional(),
    execute: async (input) => {
      const context = getContext();
      const xpath = input?.xpath?.trim();
      const id = input?.id;
      const filter = input?.filter ?? "all";
      const description = input?.description?.trim() || "Read diagram content";
      return await executeDrawioRead(
        { xpath, id, filter, description },
        context,
      );
    },
  });
}

function createDrawioEditBatchTool(getContext: () => ToolExecutionContext) {
  return tool({
    description: `Batch edit DrawIO diagram with atomic execution (all succeed or all rollback).

**Locator (choose one per operation):**
- \`id\`: mxCell ID (preferred, auto-converts to XPath \`//mxCell[@id='xxx']\`)
- \`xpath\`: XPath expression for complex targeting

**Operation Types:**
| Type | Required Fields | Description |
|------|-----------------|-------------|
| set_attribute | key, value | Set/update attribute value |
| remove_attribute | key | Remove attribute from element |
| insert_element | new_xml, position? | Insert new XML node |
| remove_element | - | Delete matched element(s) |
| replace_element | new_xml | Replace element with new XML |
| set_text_content | value | Set element text content |

**Insert Positions:** append_child (default), prepend_child, before, after

**Options:**
- \`allow_no_match: true\`: Skip operation if target not found (instead of failing)
- \`description\`: Human-readable description for logging

**Example:**
\`\`\`json
{
  "operations": [
    { "type": "set_attribute", "id": "node-1", "key": "value", "value": "New Label" },
    { "type": "set_attribute", "id": "node-1", "key": "style", "value": "fillColor=#ff0000" }
  ],
  "description": "Update node label and color"
}
\`\`\`

**Important:** Always use drawio_read first to verify element IDs exist.`,
    inputSchema: drawioEditBatchInputSchema,
    execute: async ({ operations, description }) => {
      const context = getContext();
      const finalDescription = description?.trim() || "Batch edit diagram";
      return await executeDrawioEditBatch(
        { operations, description: finalDescription },
        context,
      );
    },
  });
}

function createDrawioOverwriteTool(getContext: () => ToolExecutionContext) {
  return tool({
    description: `Completely replace the entire DrawIO diagram XML content.

**When to Use:**
- Apply a new template from scratch
- Complete diagram restructure
- Restore from a saved state

**When NOT to Use:**
- Modifying specific elements → use \`drawio_edit_batch\` instead
- Adding/removing single elements → use \`drawio_edit_batch\` instead

**Input Requirements:**
- \`drawio_xml\`: Complete, valid DrawIO XML string
- Must include proper \`<mxGraphModel>\` root structure
- XML format is validated before applying

**Example Structure:**
\`\`\`xml
<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <!-- Your diagram content -->
  </root>
</mxGraphModel>
\`\`\`

**Warning:** This replaces the ENTIRE diagram. All existing content will be lost.`,
    inputSchema: drawioOverwriteInputSchema,
    execute: async ({ drawio_xml, description }) => {
      const context = getContext();
      const validation = validateXMLFormat(drawio_xml);
      if (!validation.valid) {
        throw new Error(validation.error || "XML validation failed");
      }

      const finalDescription =
        description?.trim() || "Overwrite entire diagram";

      // Call frontend tool to replace XML
      return (await executeToolOnClient(
        REPLACE_DRAWIO_XML,
        { drawio_xml },
        context.projectUuid,
        context.conversationId,
        finalDescription,
        { signal: context.abortSignal, chatRunId: context.chatRunId },
      )) as ReplaceXMLResult;
    },
  });
}

export function createDrawioTools(context: ToolExecutionContext) {
  const getContext = () => requireContext(context);

  return {
    [DRAWIO_READ]: createDrawioReadTool(getContext),
    [DRAWIO_EDIT_BATCH]: createDrawioEditBatchTool(getContext),
    [DRAWIO_OVERWRITE]: createDrawioOverwriteTool(getContext),
  };
}

export type DrawioTools = ReturnType<typeof createDrawioTools>;
