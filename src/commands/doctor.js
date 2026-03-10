import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import { log } from '../utils/logger.js';
import { getMcpsDir, getSkillsDir } from '../registry/paths.js';
import { listFiles, listDirs, fileExists } from '../utils/fileUtils.js';
import { validateMcp, validateToolDef } from '../utils/validator.js';
import { loadTool, listTools } from '../registry/toolRegistry.js';
import { readJson } from '../utils/fileUtils.js';
import { getWorkspacePath } from '../workspace/workspaceConfig.js';

export function makeDoctorCommand() {
  return new Command('doctor')
    .description('Check registry integrity and validate workspace config')
    .action(() => {
      const issues = [];

      // Check registry dirs exist
      for (const [label, dir] of [
        ['mcps', getMcpsDir()],
        ['skills', getSkillsDir()],
      ]) {
        if (!fs.existsSync(dir)) {
          issues.push(`Registry dir missing: ${dir}`);
        }
      }

      // Validate all MCP JSON files in registry
      const mcpsDir = getMcpsDir();
      const mcpFiles = listFiles(mcpsDir).filter(f => f.endsWith('.json'));
      for (const file of mcpFiles) {
        const data = readJson(path.join(mcpsDir, file));
        const { valid, errors } = validateMcp(data);
        if (!valid) {
          issues.push(`MCP file "${file}": ${errors.join('; ')}`);
        }
      }

      // Validate all tool definitions
      const knownToolIds = listTools();
      for (const toolId of knownToolIds) {
        const toolDef = loadTool(toolId);
        const { valid, errors } = validateToolDef(toolDef);
        if (!valid) {
          issues.push(`Tool "${toolId}": ${errors.join('; ')}`);
        }
      }

      // Validate .awm.json if present in cwd
      const wsPath = getWorkspacePath();
      if (fs.existsSync(wsPath)) {
        const ws = readJson(wsPath);
        if (!ws) {
          issues.push('.awm.json: invalid JSON');
        } else {
          if (!Array.isArray(ws.tools)) issues.push('.awm.json: "tools" must be an array');
          if (!Array.isArray(ws.mcps)) issues.push('.awm.json: "mcps" must be an array');
          if (!Array.isArray(ws.skills)) issues.push('.awm.json: "skills" must be an array');

          if (Array.isArray(ws.tools)) {
            for (const toolId of ws.tools) {
              if (!knownToolIds.includes(toolId)) {
                issues.push(`.awm.json: unknown tool "${toolId}"`);
              }
            }
          }

          const knownMcpIds = new Set(mcpFiles.map(f => f.replace(/\.json$/, '')));
          if (Array.isArray(ws.mcps)) {
            for (const mcpId of ws.mcps) {
              if (!knownMcpIds.has(mcpId)) {
                issues.push(`.awm.json: MCP "${mcpId}" not found in registry`);
              }
            }
          }

          const knownSkills = new Set(listDirs(getSkillsDir()));
          if (Array.isArray(ws.skills)) {
            for (const skillName of ws.skills) {
              if (!knownSkills.has(skillName)) {
                issues.push(`.awm.json: skill "${skillName}" not found in registry`);
              } else {
                const skillMd = path.join(getSkillsDir(), skillName, 'SKILL.md');
                if (!fileExists(skillMd)) {
                  issues.push(`.awm.json: skill "${skillName}" missing SKILL.md`);
                }
              }
            }
          }
        }
      }

      if (issues.length > 0) {
        for (const issue of issues) log.error(issue);
        process.exit(1);
      } else {
        log.success('No issues found');
      }
    });
}
