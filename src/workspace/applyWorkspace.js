import path from 'node:path';
import { log } from '../utils/logger.js';
import { getMcp } from '../registry/mcpRegistry.js';
import { listSkills } from '../registry/skillRegistry.js';
import { loadTool } from '../registry/toolRegistry.js';
import { applyMcpJson } from '../adapters/jsonAdapter.js';
import { applyMcpToml } from '../adapters/tomlAdapter.js';
import { applySkills } from '../adapters/skillApplier.js';
import { resolvePath } from '../utils/pathResolver.js';

/**
 * Apply all MCPs and skills from a workspace config to every listed tool (project scope).
 * @param {object} workspace
 * @param {boolean} dryRun
 */
export async function applyAll(workspace, dryRun = false) {
  const { tools = [], mcps: mcpIds = [], skills: skillNames = [] } = workspace;

  // Validate all MCP refs first — collect all errors, abort before any writes
  const errors = [];
  const mcpDefs = [];
  for (const id of mcpIds) {
    const def = getMcp(id);
    if (!def) {
      errors.push(`MCP "${id}" not found in registry`);
    } else {
      mcpDefs.push(def);
    }
  }

  const registeredSkills = listSkills();
  for (const name of skillNames) {
    if (!registeredSkills.includes(name)) {
      errors.push(`Skill "${name}" not found in registry`);
    }
  }

  if (errors.length > 0) {
    for (const e of errors) log.error(e);
    throw new Error('Aborting apply due to missing registry entries');
  }

  // Apply to each tool (project scope only)
  for (const toolId of tools) {
    const tool = loadTool(toolId);
    if (!tool) {
      log.warn(`Tool "${toolId}" not found — skipping`);
      continue;
    }

    const mcpConfig = tool.mcp?.project;
    if (!mcpConfig) {
      log.warn(`Tool "${toolId}" has no project MCP config — skipping MCPs`);
    } else {
      const targetFile = path.join(process.cwd(), mcpConfig.targetFile);
      const format = tool.mcp.format;
      if (format === 'toml') {
        await applyMcpToml(targetFile, mcpConfig.rootObject, mcpDefs, dryRun);
      } else {
        await applyMcpJson(targetFile, mcpConfig.rootObject, mcpDefs, dryRun);
      }
    }

    // Apply skills if tool supports them
    if (tool.supports?.skills && skillNames.length > 0) {
      const skillsConfig = tool.skills?.project;
      if (!skillsConfig) {
        log.warn(`Tool "${toolId}" has no project skills config — skipping skills`);
      } else {
        const targetFolder = path.join(process.cwd(), skillsConfig.targetFolder);
        await applySkills(skillNames, targetFolder, dryRun);
      }
    }
  }

  if (!dryRun && (mcpDefs.length > 0 || skillNames.length > 0)) {
    log.success(`Applied to tools: ${tools.join(', ')}`);
    if (mcpDefs.length > 0) log.info(`  MCPs: ${mcpDefs.map(m => m.id).join(', ')}`);
    if (skillNames.length > 0) log.info(`  Skills: ${skillNames.join(', ')}`);
  }
}
