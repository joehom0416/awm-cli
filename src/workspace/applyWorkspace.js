import path from 'node:path';
import inquirer from 'inquirer';
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

  // Resolve MCP refs — skip missing ones with a warning
  const mcpDefs = [];
  for (const id of mcpIds) {
    const def = getMcp(id);
    if (!def) {
      log.warn(`MCP "${id}" not found in registry — skipping`);
    } else {
      mcpDefs.push(def);
    }
  }

  const registeredSkills = listSkills();
  const resolvedSkillNames = [];
  for (const name of skillNames) {
    if (!registeredSkills.includes(name)) {
      log.warn(`Skill "${name}" not found in registry — skipping`);
    } else {
      resolvedSkillNames.push(name);
    }
  }

  // Apply to each tool (project scope only)
  for (const toolId of tools) {
    const tool = loadTool(toolId);
    if (!tool) {
      log.warn(`Tool "${toolId}" not found — skipping`);
      continue;
    }

    const mcpConfig = tool.mcp?.project;
    const mcpGlobalConfig = tool.mcp?.global;
    if (!mcpConfig && mcpGlobalConfig && mcpDefs.length > 0) {
      if (dryRun) {
        log.dryRun(`Tool "${toolId}" has no project MCP config but has global config — would prompt user`);
      } else {
        const { deployGlobal } = await inquirer.prompt([{
          type: 'confirm',
          name: 'deployGlobal',
          message: `Tool "${toolId}" does not support project-based MCP config. Deploy MCPs to global instead?`,
          default: false,
        }]);
        if (deployGlobal) {
          const targetFile = resolvePath(mcpGlobalConfig.targetFile);
          const format = tool.mcp.format;
          if (format === 'toml') {
            await applyMcpToml(targetFile, mcpGlobalConfig.rootObject, mcpDefs, dryRun);
          } else {
            await applyMcpJson(targetFile, mcpGlobalConfig.rootObject, mcpDefs, dryRun);
          }
        }
      }
    } else if (!mcpConfig) {
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
    if (tool.supports?.skills && resolvedSkillNames.length > 0) {
      const skillsConfig = tool.skills?.project;
      const skillsGlobalConfig = tool.skills?.global;
      if (!skillsConfig && skillsGlobalConfig && resolvedSkillNames.length > 0) {
        if (dryRun) {
          log.dryRun(`Tool "${toolId}" has no project skills config but has global config — would prompt user`);
        } else {
          const { deployGlobal } = await inquirer.prompt([{
            type: 'confirm',
            name: 'deployGlobal',
            message: `Tool "${toolId}" does not support project-based skills config. Deploy skills to global instead?`,
            default: false,
          }]);
          if (deployGlobal) {
            const targetFolder = resolvePath(skillsGlobalConfig.targetFolder);
            await applySkills(resolvedSkillNames, targetFolder, dryRun);
          }
        }
      } else if (!skillsConfig) {
        log.warn(`Tool "${toolId}" has no project skills config — skipping skills`);
      } else {
        const targetFolder = path.join(process.cwd(), skillsConfig.targetFolder);
        await applySkills(resolvedSkillNames, targetFolder, dryRun);
      }
    }
  }

  if (!dryRun && (mcpDefs.length > 0 || resolvedSkillNames.length > 0)) {
    log.success(`Applied to tools: ${tools.join(', ')}`);
    if (mcpDefs.length > 0) log.info(`  MCPs: ${mcpDefs.map(m => m.id).join(', ')}`);
    if (resolvedSkillNames.length > 0) log.info(`  Skills: ${resolvedSkillNames.join(', ')}`);
  }
}
