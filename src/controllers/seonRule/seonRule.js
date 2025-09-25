import prisma from '../../lib/prisma.js';
import { sendError, sendSuccess } from '../../utils/sendResponse.js';

export async function createSeonRule(req, res) {
  try {
    const { approvalType, minScore, maxScore } = req.body;

    if (!approvalType || minScore == null || maxScore == null) {
      return sendError(res, null, "All fields are required", 400);
    }

    const rule = await prisma.seonApprovalRule.create({
      data: { approvalType, minScore, maxScore },
    });

    return sendSuccess(res, rule, "Rule created successfully");
  } catch (err) {
    return sendError(res, err.message, "Failed to create rule", 500);
  }
}

export async function listSeonRules(req, res) {
  try {
    const rules = await prisma.seonApprovalRule.findMany({
      orderBy: { createdAt: "desc" },
    });

    return sendSuccess(res, rules, "Rules fetched successfully");
  } catch (err) {
    return sendError(res, err.message, "Failed to fetch rules", 500);
  }
}

export async function updateSeonRule(req, res) {
  try {
    const { id } = req.params;
    const { approvalType, minScore, maxScore } = req.body;

    const updated = await prisma.seonApprovalRule.update({
      where: { id },
      data: { approvalType, minScore, maxScore },
    });

    return sendSuccess(res, updated, "Rule updated successfully");
  } catch (err) {
    return sendError(res, err.message, "Failed to update rule", 500);
  }
}

export async function deleteSeonRule(req, res) {
  try {
    const { id } = req.params;

    await prisma.seonApprovalRule.delete({ where: { id } });

    return sendSuccess(res, null, "Rule deleted successfully");
  } catch (err) {
    return sendError(res, err.message, "Failed to delete rule", 500);
  }
}
