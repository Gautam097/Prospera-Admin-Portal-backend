import prisma from '../../lib/prisma.js';
import { sendError, sendSuccess } from '../../utils/sendResponse.js';

export async function createLimit(req, res) {
  try {
    const {
      type,
      limitAmount,
      timeWindowHrs,
      platformFeeType,
      platformFeeValue,
      isActive,
    } = req.body;

   const { userId } = req.user;

    if (!type || isActive == null) {
      return sendError(res, null, "Type and isActive are required", 400);
    }

    // Check if type already exists (unique constraint)
    const existing = await prisma.limitConfig.findUnique({ where: { type } });
    if (existing) {
      return sendError(res, null, "Limit for this type already exists", 400);
    }

    // Validation depending on type
    let data = { type, isActive };

    if (type === "PLATFORM_FEE") {
      if (!platformFeeType || platformFeeValue == null) {
        return sendError(res, null, "platformFeeType and platformFeeValue are required for PLATFORM_FEE", 400);
      }
      data = { ...data, platformFeeType, platformFeeValue };
    } else {
      if (limitAmount == null || timeWindowHrs == null) {
        return sendError(res, null, "limitAmount and timeWindowHrs are required for this type", 400);
      }
      data = { ...data, limitAmount, timeWindowHrs };
    }

    // Create limit
    const limit = await prisma.limitConfig.create({ data });

    // Log action
    await prisma.limitLog.create({
      data: {
        adminId : userId,
        action: "CREATE",
        type,
        oldValue: null,
        newValue: JSON.stringify(limit),
      },
    });

    return sendSuccess(res, limit, "Limit created successfully");
  } catch (err) {
    return sendError(res, err.message, "Failed to create limit", 500);
  }
}

export async function updateLimit(req, res) {
  try {
    const { type, limitAmount, timeWindowHrs, isActive } = req.body;
    const { userId } = req.user;

    if (!type) {
      return sendError(res, null, "Type are required", 400);
    }

    // Special case for PLATFORM_FEE
    if (type !== "PLATFORM_FEE" && timeWindowHrs == null) {
      return sendError(res, null, "timeWindowHrs is required for this type", 400);
    }

    const existingLimit = await prisma.limitConfig.findUnique({ where: { type } });
    if (!existingLimit) {
      return sendError(res, null, "Limit not found for this type", 404);
    }

    const updateData = {
      limitAmount,
      isActive,
      timeWindowHrs: type === "PLATFORM_FEE" ? null : timeWindowHrs,
    };

    const updatedLimit = await prisma.limitConfig.update({
      where: { type },
      data: updateData,
    });

    await prisma.limitLog.create({
      data: {
        adminId : userId,
        action: "UPDATE",
        type,
        oldValue: JSON.stringify(existingLimit),
        newValue: JSON.stringify(updatedLimit),
      },
    });

    return sendSuccess(res, updatedLimit, "Limit updated successfully");
  } catch (err) {
    return sendError(res, err.message, "Failed to update limit", 500);
  }
}

/**
 * Get All Limits
 */
export async function getLimits(req, res) {
  try {
    const limits = await prisma.limitConfig.findMany();
    return sendSuccess(res, limits, "Limits fetched successfully");
  } catch (err) {
    return sendError(res, err.message, "Failed to fetch limits", 500);
  }
}

/**
 * Get Limit by Type
 */
export async function getLimitByType(req, res) {
  try {
    const { type } = req.params;

    const limit = await prisma.limitConfig.findUnique({ where: { type } });
    if (!limit) {
      return sendError(res, null, "Limit not found", 404);
    }

    return sendSuccess(res, limit, "Limit fetched successfully");
  } catch (err) {
    return sendError(res, err.message, "Failed to fetch limit", 500);
  }
}

/**
 * Delete Limit
 */
export async function deleteLimit(req, res) {
  try {
    const { type } = req.params;
    const { userId } = req.user;

    const existing = await prisma.limitConfig.findUnique({ where: { type } });
    if (!existing) {
      return sendError(res, null, "Limit not found", 404);
    }

    await prisma.limitConfig.delete({ where: { type } });

    await prisma.limitLog.create({
      data: {
        adminId : userId,
        action: "DELETE",
        type,
        oldValue: JSON.stringify(existing),
        newValue: null,
      },
    });

    return sendSuccess(res, null, "Limit deleted successfully");
  } catch (err) {
    return sendError(res, err.message, "Failed to delete limit", 500);
  }
}
