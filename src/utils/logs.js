// utils/logger.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function logCrudAction(
  tableName,
  action,
  recordId,
  type,
  oldData = null,
  newData = null
) {
  await prisma.logs.create({
    data: {
      tableName,
      action,
      recordId,
      type,
      oldData,
      newData,
    },
  });
}
