const VALID_TRANSPORTS = ['stdio', 'sse', 'http'];
const VALID_SCOPES = ['project', 'global'];

/**
 * Validate an MCP server definition.
 * Returns { valid: boolean, errors: string[] }
 * @param {any} mcp
 */
export function validateMcp(mcp) {
  const errors = [];
  if (!mcp || typeof mcp !== 'object') {
    return { valid: false, errors: ['MCP definition must be an object'] };
  }
  if (!mcp.id || typeof mcp.id !== 'string') {
    errors.push('MCP requires a string "id" field');
  }
  if (!mcp.transport || !VALID_TRANSPORTS.includes(mcp.transport)) {
    errors.push(`MCP requires "transport" to be one of: ${VALID_TRANSPORTS.join(', ')}`);
  }
  if (!mcp.command || typeof mcp.command !== 'string') {
    errors.push('MCP requires a string "command" field');
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Validate a profile definition.
 * Returns { valid: boolean, errors: string[] }
 * @param {any} profile
 */
export function validateProfile(profile) {
  const errors = [];
  if (!profile || typeof profile !== 'object') {
    return { valid: false, errors: ['Profile definition must be an object'] };
  }
  if (!profile.id || typeof profile.id !== 'string') {
    errors.push('Profile requires a string "id" field');
  }
  if (!profile.tool || typeof profile.tool !== 'string') {
    errors.push('Profile requires a string "tool" field');
  }
  if (!profile.scope || !VALID_SCOPES.includes(profile.scope)) {
    errors.push(`Profile requires "scope" to be one of: ${VALID_SCOPES.join(', ')}`);
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Validate a tool definition.
 * Returns { valid: boolean, errors: string[] }
 * @param {any} tool
 */
export function validateToolDef(tool) {
  const errors = [];
  if (!tool || typeof tool !== 'object') {
    return { valid: false, errors: ['Tool definition must be an object'] };
  }
  if (!tool.id || typeof tool.id !== 'string') {
    errors.push('Tool definition requires a string "id" field');
  }
  if (!tool.name || typeof tool.name !== 'string') {
    errors.push('Tool definition requires a string "name" field');
  }
  if (!tool.supports || typeof tool.supports !== 'object') {
    errors.push('Tool definition requires a "supports" object');
  }
  return { valid: errors.length === 0, errors };
}
