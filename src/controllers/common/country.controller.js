import prisma from '../../lib/prisma.js';
import logger from '../../utils/winston.logger.js';
import { sendError, sendSuccess } from '../../utils/sendResponse.js';
// import { CountryStatus } from '@prisma/client';
import pkg from '@prisma/client';
const { CountryStatus } = pkg;

// ---------------- CREATE ----------------
export const createCountry = async (req, res) => {
  try {
    const { name, code } = req.body;

    if (!name?.trim()) {
      return sendError(res, "Validation Error", "Country name is required", 400);
    }

    const country = await prisma.country.create({
      data: { name: name.trim(), code: code?.trim() || null }
    });

    return sendSuccess(res, country, "Country created successfully");
  } catch (err) {
    logger.error("createCountry error:", err);
    return sendError(res, err, "Failed to create country");
  }
};

// ---------------- READ ----------------
export const listCountries = async (req, res) => {
  try {
    const {
      states,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc",
      search,
    } = req.body;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const includeStates = states === true || states === "true";
    const sortOrder = order === "asc" ? "asc" : "desc";

    const whereClause = {
      status: CountryStatus.Active,
      ...(search?.trim() && {
        OR: [
          { name: { contains: search.trim(), mode: "insensitive" } },
          { code: { contains: search.trim(), mode: "insensitive" } },
        ],
      }),
    };

    const [count, countries] = await Promise.all([
      prisma.country.count({ where: whereClause }),
      prisma.country.findMany({
        where: whereClause,
        include: includeStates ? { states: true } : undefined,
        skip,
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder },
      }),
    ]);

    return sendSuccess(
      res,
      {
        data: countries,
        count,
        page: parseInt(page),
        totalPages: Math.ceil(count / limit),
      },
      "Countries list fetched successfully"
    );
  } catch (err) {
    logger.error("listCountries error:", err);
    return sendError(res, err, "Failed to fetch countries");
  }
};

// ---------------- UPDATE ----------------
export const updateCountry = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, status } = req.body;

    if (!id || typeof id !== "string") {
      return sendError(res, "Validation Error", "Valid country ID is required", 400);
    }

    const country = await prisma.country.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(code && { code: code.trim() }),
        ...(status && { status }),
      },
    });

    return sendSuccess(res, country, "Country updated successfully");
  } catch (err) {
    logger.error("updateCountry error:", err);
    return sendError(res, err, "Failed to update country");
  }
};

// ---------------- DELETE ----------------
export const deleteCountry = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return sendError(res, "Validation Error", "Valid country ID is required", 400);
    }

    await prisma.country.delete({ where: { id } });

    return sendSuccess(res, null, "Country deleted successfully");
  } catch (err) {
    logger.error("deleteCountry error:", err);
    return sendError(res, err, "Failed to delete country");
  }
};

// ---------------- TOGGLE STATUS ----------------
export const toggleCountryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || typeof id !== "string") {
      return sendError(res, "Validation Error", "Valid country ID is required", 400);
    }

    const isActive = Boolean(status);

    const country = await prisma.country.update({
      where: { id },
      data: { isActive },
    });

    return sendSuccess(res, country, `Country ${isActive ? "activated" : "deactivated"} successfully`);
  } catch (err) {
    logger.error("toggleCountryStatus error:", err);
    return sendError(res, err, "Failed to toggle country status");
  }
};
