import prisma from '../../lib/prisma.js';
import logger from '../../utils/winston.logger.js';
import { sendError, sendSuccess } from '../../utils/sendResponse.js';
// import { CountryStatus as CityStatus} from '@prisma/client';
import pkg from '@prisma/client';
const { CountryStatus: CityStatus } = pkg;

// ---------------- CREATE ----------------
export const createCity = async (req, res) => {
  try {
    const { name, stateId } = req.body;
    if (!name || !stateId) return sendError(res, "Validation Error", "City name and stateId are required", 400);

    const city = await prisma.city.create({
      data: { name, stateId:stateId },
    });
    return sendSuccess(res, city, "City created successfully");
  } catch (err) {
    logger.error("createCity error:", err);
    return sendError(res, err, "Failed to create city");
  }
};

// ---------------- READ ----------------
export const listCities = async (req, res) => {
  try {
    const includeStates = req.body.states === true || req.body.states === "true";
    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;
    const skip = (page - 1) * limit;

    const sortBy = req.body.sortBy || "createdAt";
    const order = req.body.order === "asc" ? "asc" : "desc";

    const search = req.body.search?.trim();

    const whereClause = {
      status: CityStatus.Active,
      ...(search && {
        OR: [{ name: { contains: search, mode: "insensitive" } }],
      }),
    };

    const count = await prisma.city.count({ where: whereClause });

    const cities = await prisma.city.findMany({
      where: whereClause,
      include: { state: includeStates },
      skip,
      take: limit,
      orderBy: { [sortBy]: order },
    });

    return sendSuccess(
      res,
      { data: cities, count, page, totalPages: Math.ceil(count / limit) },
      "Cities list fetched successfully"
    );
  } catch (err) {
    logger.error("listCities error:", err);
    return sendError(res, err, "Failed to fetch cities");
  }
};

// ---------------- UPDATE ----------------
export const updateCity = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, stateId, status } = req.body;
    if (!id) return sendError(res, "Validation Error", "City ID is required", 400);

    const city = await prisma.city.update({
      where: { id: id },
      data: { name, stateId: stateId, status },
    });
    return sendSuccess(res, city, "City updated successfully");
  } catch (err) {
    logger.error("updateCity error:", err);
    return sendError(res, err, "Failed to update city");
  }
};

//--------------------------Delete-----------------
export const deleteCity = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return sendError(res, "Validation Error", "Valid city ID is required", 400);
    }

    await prisma.city.delete({
      where: { id },
    });

    return sendSuccess(res, null, "City deleted successfully");
  } catch (err) {
    logger.error("deleteCity error:", err);
    return sendError(res, err, "Failed to delete city");
  }
};

// ---------------- TOGGLE STATUS ----------------
export const toggleCityStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!id) return sendError(res, "Validation Error", "City ID is required", 400);

    const city = await prisma.city.update({
      where: { id: Number(id) },
      data: { isActive: Boolean(status) },
    });
    const action = city.isActive ? "activated" : "deactivated";
    return sendSuccess(res, city, `City ${action} successfully`);
  } catch (err) {
    logger.error("toggleCityStatus error:", err);
    return sendError(res, err, "Failed to toggle city status");
  }
};