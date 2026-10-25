const dataStore = require('../services/dataStore');

// @desc    Get all roles for current company
// @route   GET /api/roles
// @access  Private (Admin, or view roles permission)
const getRoles = async (req, res) => {
  try {
    const companyId = req.user?.companyId || 'default-company';
    const roles = await dataStore.findRoles(companyId);
    return res.status(200).json({
      success: true,
      count: roles.length,
      roles,
    });
  } catch (error) {
    console.error('[GetRoles Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve roles' });
  }
};

// @desc    Get single role by ID
// @route   GET /api/roles/:id
// @access  Private
const getRoleById = async (req, res) => {
  try {
    const role = await dataStore.findRoleById(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }
    return res.status(200).json({ success: true, role });
  } catch (error) {
    console.error('[GetRoleById Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve role' });
  }
};

// @desc    Create a new custom role
// @route   POST /api/roles
// @access  Private (Admin)
const createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    const companyId = req.user?.companyId || 'default-company';

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Role name is required' });
    }

    const existing = await dataStore.findRoleByName(name.trim(), companyId);
    if (existing) {
      return res.status(400).json({ success: false, message: `A role named "${name.trim()}" already exists` });
    }

    const defaultModules = ['employees', 'attendance', 'leave', 'payroll', 'roles', 'settings'];
    const formattedPermissions = defaultModules.map((mod) => {
      const found = (permissions || []).find((p) => p.module?.toLowerCase() === mod);
      return {
        module: mod,
        actions: {
          view: Boolean(found?.actions?.view),
          create: Boolean(found?.actions?.create),
          edit: Boolean(found?.actions?.edit),
          delete: Boolean(found?.actions?.delete),
          approve: Boolean(found?.actions?.approve),
          export: Boolean(found?.actions?.export),
        },
        scope: found?.scope || 'Company',
      };
    });

    const newRole = await dataStore.createRole({
      name: name.trim(),
      description: description?.trim() || '',
      companyId,
      isSystem: false,
      permissions: formattedPermissions,
    });

    await dataStore.logAudit({
      userId: req.user._id || req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'ROLE_CREATE',
      module: 'Roles',
      details: `Created custom role "${newRole.name}"`,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: `Role "${newRole.name}" created successfully`,
      role: newRole,
    });
  } catch (error) {
    console.error('[CreateRole Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create role' });
  }
};

// @desc    Update a custom role
// @route   PUT /api/roles/:id
// @access  Private (Admin)
const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissions } = req.body;

    const role = await dataStore.findRoleById(id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    if (role.isSystem && role.name === 'Admin') {
      return res.status(400).json({
        success: false,
        message: 'System Admin role cannot have its permissions modified to prevent lockout.',
      });
    }

    const updateData = {};
    if (name && !role.isSystem) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (permissions && Array.isArray(permissions)) {
      updateData.permissions = permissions;
    }

    const updated = await dataStore.updateRole(id, updateData);

    await dataStore.logAudit({
      userId: req.user._id || req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'ROLE_UPDATE',
      module: 'Roles',
      details: `Updated role "${role.name}"`,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: `Role "${role.name}" updated successfully`,
      role: updated,
    });
  } catch (error) {
    console.error('[UpdateRole Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update role' });
  }
};

// @desc    Delete a custom role
// @route   DELETE /api/roles/:id
// @access  Private (Admin)
const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await dataStore.findRoleById(id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    if (role.isSystem) {
      return res.status(400).json({
        success: false,
        message: `System role "${role.name}" cannot be deleted.`,
      });
    }

    // Check if any users have this role
    const usersWithRole = await dataStore.findUsers({ role: role.name });
    if (usersWithRole.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete role "${role.name}" because ${usersWithRole.length} user(s) are currently assigned to it. Reassign them first.`,
      });
    }

    await dataStore.deleteRole(id);

    await dataStore.logAudit({
      userId: req.user._id || req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'ROLE_DELETE',
      module: 'Roles',
      details: `Deleted role "${role.name}"`,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: `Role "${role.name}" deleted successfully`,
    });
  } catch (error) {
    console.error('[DeleteRole Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to delete role' });
  }
};

// @desc    Duplicate an existing role
// @route   POST /api/roles/:id/duplicate
// @access  Private (Admin)
const duplicateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const original = await dataStore.findRoleById(id);
    if (!original) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    const companyId = req.user?.companyId || 'default-company';
    let newName = `Copy of ${original.name}`;
    let counter = 1;
    while (await dataStore.findRoleByName(newName, companyId)) {
      counter++;
      newName = `Copy of ${original.name} (${counter})`;
    }

    const newRole = await dataStore.createRole({
      name: newName,
      description: `Cloned from ${original.name}. ${original.description || ''}`,
      companyId,
      isSystem: false,
      permissions: JSON.parse(JSON.stringify(original.permissions || [])),
    });

    return res.status(201).json({
      success: true,
      message: `Role cloned as "${newName}"`,
      role: newRole,
    });
  } catch (error) {
    console.error('[DuplicateRole Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to duplicate role' });
  }
};

module.exports = {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  duplicateRole,
};
