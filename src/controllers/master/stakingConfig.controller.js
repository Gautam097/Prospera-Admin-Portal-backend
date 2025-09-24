import prisma from '../../lib/prisma.js';
import logger from '../../utils/winston.logger.js';
import { sendError, sendSuccess } from '../../utils/sendResponse.js';
import { logAdminAction } from '../../utils/logAdminAction.js';


// ------------------ CREATE ------------------
export const createStakingConfig = async (req, res) => {
  const { name, apr, lockPeriod, earlywithdrawAllowed,minAmount,maxAmount} = req.body;
  try {
    const config = await prisma.stakingConfig.create({
      data: {
        name,
        apr,
        lockPeriod,
        earlywithdrawAllowed,
        minAmount,
        maxAmount
      },
    });
    return sendSuccess(res, config, 'Staking config created successfully');
  } catch (err) {
    logger.error('createStakingConfig error:', err);
    return sendError(res, err, 'Failed to create staking config');
  }
};

// ------------------ READ (LIST ALL) ------------------
export const listStakingConfigs = async (req, res) => {
  try {
    const {
      isActive,
      includeDeleted = false,
      name,
      page = 1,
      limit = 10,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filters = {
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...(includeDeleted !== 'true' && { isDeleted: false }), // default: exclude deleted
      ...(name && {
        name: { contains: name, mode: 'insensitive' },
      }),
    };

    const [configs, count] = await Promise.all([
      prisma.stakingConfig.findMany({
        where: filters,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.stakingConfig.count({ where: filters }),
    ]);

    return sendSuccess(res, {
      data: configs,
      count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
    }, 'Staking configs fetched');
  } catch (err) {
    logger.error('listStakingConfigs error:', err);
    return sendError(res, err, 'Failed to fetch staking configs');
  }
};


// ------------------ READ (GET ONE) ------------------
export const getStakingConfig = async (req, res) => {
  const { id } = req.params;
  try {
    const config = await prisma.stakingConfig.findUnique({
      where: { id },
    });
    if (!config) return sendError(res, 'Not Found', 'Staking config not found', 404);
    return sendSuccess(res, config, 'Staking config fetched');
  } catch (err) {
    logger.error('getStakingConfig error:', err);
    return sendError(res, err, 'Failed to fetch staking config');
  }
};

// ------------------ UPDATE ------------------
export const updateStakingConfig = async (req, res) => {
  const { id } = req.params;
  const { name, apr, lockPeriod, earlywithdrawAllowed, minAmount, maxAmount, isActive } = req.body;

  try {

    const existing = await prisma.stakingConfig.findUnique({ where: { id } });

    if (!existing) {
      return sendError(res, 'Not Found', 'Staking config not found', 404);
    }

    const updated = await prisma.stakingConfig.update({
      where: { id },
      data: {
        name,
        apr,
        lockPeriod,
        earlywithdrawAllowed,
        minAmount,
        maxAmount,
        isActive,
      },
    });

    await logAdminAction({
      adminId: req.user?.id || 'cmer146vw0008bm0ain16nbef', // Replace or attach from auth
      modelName: 'StakingConfig',
      actionType: 'UPDATE',
      targetId: id,
      previousData: existing,
      newData: updated,
    });
    
    return sendSuccess(res, updated, 'Staking config updated successfully');
  } catch (err) {
    logger.error('updateStakingConfig error:', err);
    return sendError(res, err, 'Failed to update staking config');
  }
};

// ------------------ SOFT DELETE ------------------
export const deleteStakingConfig = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.stakingConfig.update({
        where: { id },
        data: { isDeleted: false },
    });
    await logAdminAction({
        adminId: req.user?.id || 'cmer146vw0008bm0ain16nbef',
        modelName: 'StakingConfig',
        actionType: 'SOFT_DELETE',
        targetId: id,
        previousData: existing,
    });
    return sendSuccess(res, null, 'Staking config deleted');
  } catch (err) {
    logger.error('deleteStakingConfig error:', err);
    return sendError(res, err, 'Failed to delete staking config');
  }
};


export const toggleStakingConfig = async (req, res) => {
  const { id } = req.params;

  try {
    // Get current status
    const config = await prisma.stakingConfig.findUnique({ where: { id } });

    if (!config) {
      return sendError(res, "Not Found", "Staking config not found", 404);
    }

    // Toggle status
    const updated = await prisma.stakingConfig.update({
      where: { id },
      data: { isActive: !config.isActive }
    });

    await logAdminAction({
        adminId: req.user?.id || 'cmer146vw0008bm0ain16nbef',
        modelName: 'StakingConfig',
        actionType: 'TOGGLE',
        targetId: id,
        previousData: config,
    });

    return sendSuccess(res, updated, `Staking config is now ${updated.isActive ? 'active' : 'inactive'}`);
  } catch (err) {
    logger.error("toggleStakingConfig error:", err);
    return sendError(res, err, "Failed to toggle staking config");
  }
};