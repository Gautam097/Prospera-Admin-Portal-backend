import prisma from '../../lib/prisma.js';
import logger from '../../utils/winston.logger.js';
import { sendError, sendSuccess } from '../../utils/sendResponse.js';
import { CountryStatus as StateStatus} from '@prisma/client';

// ---------------- CREATE ----------------
export const createState = async (req, res) => {
  try {
    const { name, countryId } = req.body;
    if (!name || !countryId) return sendError(res, "Validation Error", "State name and countryId are required", 400);

    const state = await prisma.state.create({
      data: { name, countryId: countryId },
    });
    return sendSuccess(res, state, "State created successfully");
  } catch (err) {
    logger.error("createState error:", err);
    return sendError(res, err, "Failed to create state");
  }
};

// ---------------- READ ----------------
export const listStates = async (req, res) => {
  try {
    const includeCities = req.body.cities === true || req.body.cities === "true";
    const includeCountries = req.body.country === true || req.body.country === "true";

    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;
    const skip = (page - 1) * limit;

    const sortBy = req.body.sortBy || "createdAt";
    const order = req.body.order === "asc" ? "asc" : "desc";

    const search = req.body.search?.trim();

    const whereClause = {
      status: StateStatus.Active,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const count = await prisma.state.count({ where: whereClause });

    const states = await prisma.state.findMany({
      where: whereClause,
      include: { cities: includeCities, country: includeCountries },
      skip,
      take: limit,
      orderBy: { [sortBy]: order },
    });

    return sendSuccess(
      res,
      { data: states, count, page, totalPages: Math.ceil(count / limit) },
      "States list fetched successfully"
    );
  } catch (err) {
    logger.error("listStates error:", err);
    return sendError(res, err, "Failed to fetch states");
  }
};

// ---------------- UPDATE ----------------
export const updateState = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, status, countryId } = req.body;
    if (!id) return sendError(res, "Validation Error", "State ID is required", 400);

    const state = await prisma.state.update({
      where: { id: id },
      data: { name, code, status, countryId: countryId },
    });
    return sendSuccess(res, state, "State updated successfully");
  } catch (err) {
    logger.error("updateState error:", err);
    return sendError(res, err, "Failed to update state");
  }
};

//--------------------------Delete-----------------
export const deleteState = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return sendError(res, "Validation Error", "Valid state ID is required", 400);
    }

    await prisma.state.delete({
      where: { id },
    });

    return sendSuccess(res, null, "State deleted successfully");
  } catch (err) {
    logger.error("deleteState error:", err);
    return sendError(res, err, "Failed to delete state");
  }
};



// ---------------- TOGGLE STATUS ----------------
export const toggleStateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!id) return sendError(res, "Validation Error", "State ID is required", 400);

    const state = await prisma.state.update({
      where: { id: Number(id) },
      data: { isActive: Boolean(status) },
    });
    const action = state.isActive ? "activated" : "deactivated";
    return sendSuccess(res, state, `State ${action} successfully`);
  } catch (err) {
    logger.error("toggleStateStatus error:", err);
    return sendError(res, err, "Failed to toggle state status");
  }
};