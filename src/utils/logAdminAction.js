import prisma from '../lib/prisma.js';

export async function logAdminAction({
  adminId,
  modelName,
  actionType,
  targetId,
  previousData,
  newData = null,
}) {
  const changedFields = {};

  if (newData) {
    for (const key in newData) {
      if (previousData[key] !== newData[key]) {
        changedFields[key] = {
          before: previousData[key],
          after: newData[key],
        };
      }
    }
  }

  const description = `${actionType} on ${modelName} (${targetId}) by Admin`;

  await prisma.adminActionLog.create({
    data: {
      adminId,
      actionType: `${actionType}_${modelName.toUpperCase()}`, // e.g. UPDATE_STAKINGCONFIG
      targetId,
      description,
      metadata: {
        model: modelName,
        changedFields,
        ...(newData ? { newData } : {}),
        previousData,
      },
    },
  });
}