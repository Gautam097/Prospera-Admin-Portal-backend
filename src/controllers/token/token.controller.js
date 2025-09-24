import express from "express";
import logger from '../../utils/winston.logger.js';
import { sendError, sendSuccess } from '../../utils/sendResponse.js';
import { logCrudAction } from "../../utils/logs.js";
import pkg from "@prisma/client";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();

/**
 * Create a new SupportedToken
 */
export const createToken = async (req, res) => {
  try {
    const { symbol, name, code, logoUrl, isActive } = req.body;

    // Validation
    if (!symbol || !name || !code) {
      return res.status(400).json({
        success: false,
        message: "symbol, name, and code are required",
      });
    }

    // Check if code already exists
    const existing = await prisma.supportedToken.findUnique({
      where: { code },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Token with code '${code}' already exists`,
      });
    }

    // Create the token
    const token = await prisma.supportedToken.create({
      data: {
        symbol,
        name,
        code,
        logoUrl: logoUrl || null,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Token created successfully",
      data: token,
    });
  } catch (error) {
    console.error("Error creating token:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

// Listing APi token 
export const listToken = async (req, res) => {
  try {
    // Get query params with defaults
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch paginated data where isDeleted is false
    const [tokens, total] = await Promise.all([
      prisma.supportedToken.findMany({
        skip,
        take: limit,
        where: {
          isDeleted: false, // only non-deleted tokens
        },
        include: {
          depositAddresses: true,
          cryptoHoldings: true,
          tokenNetworks: true,
          tokenPrices: true,
          supportedNetworks: true,
        },
        // orderBy: {
        //   createdAt: "desc", // if you have createdAt field
        // },
      }),
      prisma.supportedToken.count({
        where: {
          isDeleted: false,
        },
      }),
    ]);

    res.json({
      success: true,
      message: "Supported tokens fetched successfully",
      data: tokens,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching supported tokens:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};



// View single token by ID
export const viewToken = async (req, res) => {
  try {
    const { id } = req.params;

    const token = await prisma.supportedToken.findUnique({
      where: { id },
      include: {
        depositAddresses: true,
        cryptoHoldings: true,
        tokenNetworks: true,
        tokenPrices: true,
        supportedNetworks: true,
      },
    });

    if (!token) {
      return res.status(404).json({
        success: false,
        message: "Token not found",
      });
    }

    res.json({
      success: true,
      message: "Token fetched successfully",
      data: token,
    });
  } catch (error) {
    console.error("Error fetching token:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};



// Update token by ID
export const editToken = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body; // fields to update

    // 1. Get the old record before update
    const oldToken = await prisma.supportedToken.findUnique({
      where: { id },
    });

    if (!oldToken) {
      return res.status(404).json({
        success: false,
        message: "Token not found",
      });
    }

    const token = await prisma.supportedToken.update({
      where: { id },
      data,
    });
    await logCrudAction("SupportedToken", "Update", token.id, "Crypto", oldToken, token);

    res.json({
      success: true,
      message: "Token updated successfully",
      data: token,
    });
  } catch (error) {
    console.error("Error updating token:", error);

    if (error.code === "P2025") {
      // Prisma "Record not found"
      return res.status(404).json({
        success: false,
        message: "Token not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};


// Update only isActive field
export const updateTokenStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Invalid value for isActive. It must be true or false.",
      });
    }

    // 1. Get the old record before update
    const oldToken = await prisma.supportedToken.findUnique({
      where: { id },
    });

    if (!oldToken) {
      return res.status(404).json({
        success: false,
        message: "Token not found",
      });
    }

    const token = await prisma.supportedToken.update({
      where: { id },
      data: { isActive },
    });
    await logCrudAction("SupportedToken", "Update", token.id, "Crypto", oldToken, token);

    res.json({
      success: true,
      message: "Token status updated successfully",
      data: token,
    });
  } catch (error) {
    console.error("Error updating token status:", error);

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Token not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};



// Soft delete token by setting isActive to false
export const softDeleteToken = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Get the old record before update
    const oldToken = await prisma.supportedToken.findUnique({
      where: { id },
    });

    if (!oldToken) {
      return res.status(404).json({
        success: false,
        message: "Token not found",
      });
    }

    const token = await prisma.supportedToken.update({
      where: { id },
      data: { isDeleted: true },
    });

    await logCrudAction("SupportedToken", "Delete", token.id, "Crypto", oldToken, token);

    res.json({
      success: true,
      message: "Token soft deleted successfully",
      data: token,
    });
  } catch (error) {
    console.error("Error soft deleting token:", error);

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Token not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};


// Fiat 

// Fiat Listing 
export const listFiat = async (req, res) => {
  try {
    // Get query params with defaults
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch paginated data where isDeleted is false
    const [fiat, total] = await Promise.all([
      prisma.SupportedCurrency.findMany({
        skip,
        take: limit,
        where: {
          isDeleted: false, // only non-deleted tokens
        },
        // include: {
        //     currency: true,
        // },
        // orderBy: {
        //   createdAt: "desc", // if you have createdAt field
        // },
      }),
      prisma.SupportedCurrency.count({
        where: {
          isDeleted: false,
        },
      }),
    ]);

    res.json({
      success: true,
      message: "Supported Fiat fetched successfully",
      data: fiat,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching supported Fiat:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};


// Soft delete token by setting isActive to false
export const softDeleteFiat = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return sendError(res, "Missing ID", "ID not found", 400);
    }

    // 1. Get the old record before update
    const oldToken = await prisma.SupportedCurrency.findUnique({
      where: { id },
    });

    if (!oldToken) {
      return res.status(404).json({
        success: false,
        message: "Token not found",
      });
    }

    const token = await prisma.SupportedCurrency.update({
      where: { id },
      data: { isDeleted: true },
    });
    
    await logCrudAction("SupportedCurrency", "Delete", token.id, "Fiat", oldToken, token);

    res.json({
      success: true,
      message: "Fiat soft deleted successfully",
      data: token,
    });
  } catch (error) {
    console.error("Error soft deleting Fiat:", error);

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Fiat not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

// View single Fiat by ID
export const viewFiat = async (req, res) => {
  try {
    const { id } = req.params;

    const token = await prisma.SupportedCurrency.findUnique({
      where: { id },
    //   include: {
    //     currency: true,
    //   },
    });

    if (!token) {
      return res.status(404).json({
        success: false,
        message: "Fiat not found",
      });
    }

    res.json({
      success: true,
      message: "Fiat fetched successfully",
      data: token,
    });
  } catch (error) {
    console.error("Error fetching Fiat:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

// Update Fiat by ID
export const editFiat = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body; // fields to update

    // 1. Get the old record before update
    const oldToken = await prisma.SupportedCurrency.findUnique({
      where: { id },
    });

    if (!oldToken) {
      return res.status(404).json({
        success: false,
        message: "Token not found",
      });
    }

    const token = await prisma.SupportedCurrency.update({
      where: { id },
      data,
    });

    await logCrudAction("SupportedCurrency", "Update", token.id, "Fiat", oldToken, token);

    res.json({
      success: true,
      message: "Fiat updated successfully",
      data: token,
    });
  } catch (error) {
    console.error("Error updating Fiat:", error);

    if (error.code === "P2025") {
      // Prisma "Record not found"
      return res.status(404).json({
        success: false,
        message: "Fiat not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};


// Update only isActive field
export const updateFiatStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Invalid value for isActive. It must be true or false.",
      });
    }

    // 1. Get the old record before update
    const oldToken = await prisma.SupportedCurrency.findUnique({
      where: { id },
    });

    if (!oldToken) {
      return res.status(404).json({
        success: false,
        message: "Token not found",
      });
    }

    const token = await prisma.SupportedCurrency.update({
      where: { id },
      data: { isActive },
    });

    await logCrudAction("SupportedCurrency", "Update", token.id, "Fiat", oldToken, token);

    res.json({
      success: true,
      message: "Fiat status updated successfully",
      data: token,
    });
  } catch (error) {
    console.error("Error updating Fiat status:", error);

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Fiat not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};


/**
 * Create a new SupportedCurrency
 */
export const CreateFiat = async (req, res) => {
  try {
    const { code, name, symbol, logoUrl, isActive } = req.body;

    // Validation
    if (!code || !name || !symbol) {
      return res.status(400).json({
        success: false,
        message: "code, name, and symbol are required",
      });
    }

    // Check if code already exists
    const existing = await prisma.supportedCurrency.findUnique({
      where: { code },
    });
  
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Currency with code '${code}' already exists`,
      });
    }

    // Create the currency
    const currency = await prisma.supportedCurrency.create({
      data: {
        code,
        name,
        symbol,
        logoUrl: logoUrl || null,
        isActive: isActive !== undefined ? isActive : true,
      },
    });
    
    await logCrudAction("SupportedCurrency", "Create", currency.id, "Fiat", null, currency);

    res.status(201).json({
      success: true,
      message: "Currency created successfully",
      data: currency,
    });
  } catch (error) {
    console.error("Error creating currency:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};


// Network 

// Listing APi Network 
export const listNetwork = async (req, res) => {
  try {
    // Get query params with defaults
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch paginated data where isDeleted is false
    const [tokens, total] = await Promise.all([
      prisma.SupportedNetwork.findMany({
        skip,
        take: limit,
        where: {
          isDeleted: false, // only non-deleted tokens
        },
        // include: {
        //   depositAddresses: true,
        //   cryptoHoldings: true,
        //   tokenNetworks: true,
        //   tokenPrices: true,
        //   supportedNetworks: true,
        // },
        // orderBy: {
        //   createdAt: "desc", // if you have createdAt field
        // },
      }),
        prisma.supportedNetwork.count({
            where: { isDeleted: false }, // ✅ filter applied here too
        }),
    ]);

    res.json({
      success: true,
      message: "Supported Network fetched successfully",
      data: tokens,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching supported Network:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};


// View single Newtork by ID
export const viewNetwork = async (req, res) => {
  try {
    const { id } = req.params;

    const token = await prisma.supportedNetwork.findUnique({
      where: { id },
    //   include: {
    //     currency: true,
    //   },
    });

    if (!token) {
      return res.status(404).json({
        success: false,
        message: "Network not found",
      });
    }

    res.json({
      success: true,
      message: "Network fetched successfully",
      data: token,
    });
  } catch (error) {
    console.error("Error fetching Newtork:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};


// Update Newtork by ID
export const editNetwork = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body; // fields to update

    // 1. Get the old record before update
    const oldToken = await prisma.supportedNetwork.findUnique({
      where: { id },
    });

    if (!oldToken) {
      return res.status(404).json({
        success: false,
        message: "Token not found",
      });
    }

    const token = await prisma.supportedNetwork.update({
      where: { id },
      data,
    });

    await logCrudAction("supportedNetwork", "Update", token.id, "Network", oldToken, token);

    res.json({
      success: true,
      message: "Newtork updated successfully",
      data: token,
    });
  } catch (error) {
    console.error("Error updating Newtork:", error);

    if (error.code === "P2025") {
      // Prisma "Record not found"
      return res.status(404).json({
        success: false,
        message: "Newtork not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};



// Update only isActive field
export const updateNetworkStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Invalid value for isActive. It must be true or false.",
      });
    }

    // 1. Get the old record before update
    const oldToken = await prisma.supportedNetwork.findUnique({
      where: { id },
    });

    if (!oldToken) {
      return res.status(404).json({
        success: false,
        message: "Token not found",
      });
    }

    const token = await prisma.supportedNetwork.update({
      where: { id },
      data: { isActive },
    });

    await logCrudAction("supportedNetwork", "Update", token.id, "Network", oldToken, token);

    res.json({
      success: true,
      message: "Network status updated successfully",
      data: token,
    });
  } catch (error) {
    console.error("Error updating Network status:", error);

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Network not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};



// Soft delete Network by setting isActive to false
export const softDeleteNetwork = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Get the old record before update
    const oldToken = await prisma.supportedNetwork.findUnique({
      where: { id },
    });

    if (!oldToken) {
      return res.status(404).json({
        success: false,
        message: "Token not found",
      });
    }

    const token = await prisma.supportedNetwork.update({
      where: { id },
      data: { isDeleted: true },
    });

    await logCrudAction("supportedNetwork", "Delete", token.id, "Network", oldToken, token);

    res.json({
      success: true,
      message: "Network soft deleted successfully",
      data: token,
    });
  } catch (error) {
    console.error("Error soft deleting Network:", error);

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Network not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};