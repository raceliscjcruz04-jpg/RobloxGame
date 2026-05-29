const { db } = require('../database/db');

/**
 * Check if role has permission for command
 */
function hasCommandPermission(guildId, roleIds, commandName) {
  // Admin always has permission
  for (const roleId of roleIds) {
    const staffRole = db.prepare(`
      SELECT * FROM staff_roles WHERE guild_id = ? AND role_id = ?
    `).get(guildId, roleId);
    
    if (staffRole && staffRole.permission_level === 'admin') {
      return true;
    }
  }
  
  // Check explicit allow/deny
  const denied = db.prepare(`
    SELECT * FROM role_command_permissions 
    WHERE guild_id = ? AND command_name = ? AND action = ? AND role_id IN (${roleIds.map(() => '?').join(',')})
  `).get(guildId, commandName, 'deny', ...roleIds);
  
  if (denied) return false;
  
  const allowed = db.prepare(`
    SELECT * FROM role_command_permissions 
    WHERE guild_id = ? AND command_name = ? AND action = ? AND role_id IN (${roleIds.map(() => '?').join(',')})
  `).get(guildId, commandName, 'allow', ...roleIds);
  
  return !!allowed;
}

/**
 * Check if user is staff
 */
function isStaff(guildId, userId, member) {
  const staffRoles = db.prepare(`
    SELECT role_id FROM staff_roles WHERE guild_id = ?
  `).all(guildId);
  
  if (staffRoles.length === 0) return false;
  
  const staffRoleIds = staffRoles.map(sr => sr.role_id);
  return member.roles.cache.some(role => staffRoleIds.includes(role.id));
}

/**
 * Get user's permission level
 */
function getUserPermissionLevel(guildId, member) {
  const staffRole = db.prepare(`
    SELECT permission_level FROM staff_roles 
    WHERE guild_id = ? AND role_id IN (${member.roles.cache.map(() => '?').join(',')})
    ORDER BY 
      CASE permission_level 
        WHEN 'admin' THEN 1
        WHEN 'moderator' THEN 2
        WHEN 'support' THEN 3
      END
    LIMIT 1
  `).get(guildId, ...member.roles.cache.map(r => r.id));
  
  return staffRole?.permission_level || null;
}

module.exports = {
  hasCommandPermission,
  isStaff,
  getUserPermissionLevel,
};
