import prisma from '../../lib/prisma.js';
import logger from '../../utils/winston.logger.js';
import { sendError, sendSuccess } from '../../utils/sendResponse.js';
import {getBankAccountById, getBankAccountsByUserId} from '../../models/payment.model.js';
import { maskCardNumber, sanitizeCard } from '../../utils/card.encryption.js';

export async function listUsers(req, res) {
    try {
        const data = req.body;
        
        // Require pagination params
        if (!data.limit || !data.pageNo) {
            return sendError(res, 'Required Fields', "limit and pageNo are required", 400);
        }

        // Pagination setup
        const pageSize = parseInt(data.limit) || 10;
        const pageNo = parseInt(data.pageNo) || 1;
        const sortByField = data.orderBy || "createdAt";
        const sortOrder = data.order === -1 ? "desc" : "asc";

        // Where clause
        const whereClause = {};

        // Filter by specific field
        if (data.fieldName && data.fieldValue) {
            whereClause[data.fieldName] = {
                contains: data.fieldValue,
                mode: 'insensitive',
            };
        }

        // Global search
        if (data.search) {
            whereClause.OR = [
                { email: { contains: data.search.trim(), mode: 'insensitive' } },
                { name: { contains: data.search.trim(), mode: 'insensitive' } },
                { status: { contains: data.search.trim(), mode: 'insensitive' } },
            ];
        }

        // Exact status filter
        if (data.status) {
            whereClause.isActive= data.status;
        }
        
        // Count total users
        const count = await prisma.user.count({ where: whereClause });

        // Fetch users but exclude sensitive fields
        const users = await prisma.user.findMany({
            where: whereClause,
            orderBy: { [sortByField]: sortOrder },
            skip: (pageNo - 1) * pageSize,
            take: pageSize,
            select: {
                id: true,
                email: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                // ❌ password, resetToken, otp etc. not selected
            }
        });

        if (count === 0 || users.length === 0) {
            return sendSuccess(res, { data: [], count: 0 }, "No records found");
        }
        
        return sendSuccess(res, { data: users, count }, "Users fetched successfully");

    } catch (error) {
        logger.error('listUsers error:', error);
        return sendError(res, error.message || 'Error fetching users records');
    }
}

export async function getUserDetails(req, res) {
    try {
        const { id  } = req.params; // userId from URL
        const {
            // pagination
            txPage = 1,
            txLimit = 10,
            historyPage = 1,
            historyLimit = 10,
            // sorting
            txOrderBy = "createdAt",
            txOrder = "desc",
            historyOrderBy = "createdAt",
            historyOrder = "desc"
        } = req.query;

        if (!id ) {
            return sendError(res, 'Required Fields', "User ID is required", 400);
        }

        // Convert pagination params
        const txPageNo = parseInt(txPage);
        const txPageSize = parseInt(txLimit);
        const historyPageNo = parseInt(historyPage);
        const historyPageSize = parseInt(historyLimit);

        // ✅ Fetch user details
        const user = await prisma.user.findUnique({
            where: { id:id },
            select:{
                id:true,
                email:true,
                phoneNumber:true,
                verficationStatus:true,
                investorType:true,
                name:true,
                profile:{
                    select: {
                        dob: true,
                        state: true,
                        address: true,
                        zipCode: true,
                        country: true,
                    },
                },
                tokenHoldings:true,
                bankAccounts:{
                    select:{
                        bankName:true,
                        accountType:true,
                        nostroBankName:true,
                        nostroAccountNumber:true
                    }
                },
                cards:{
                    select:{
                        cardNumber:true,
                        cardType:true,
                        isActive:true,
                        lastFourDigits:true
                    }
                },
                fiatVault:{
                    select:{
                        holdings:true
                    }
                },
                vault: {
                    select: {
                        wallets: {
                            select: {
                                id: true,
                                address: true,
                                amount: true,
                                tokenNetworkId: true,
                                // cryptoHoldings: {
                                //     select: {
                                //         amount: true,
                                //         tokenId: true, // optional: if you want to know which token
                                //         token: {
                                //             select: {
                                //                 name: true,
                                //                 symbol: true
                                //             }
                                //         }
                                //     }
                                // }
                            }
                        }
                    }
                }
            },
        }); 
        
        if (user?.cards?.length > 0) {
            user.cards = await Promise.all(
                user.cards.map(async (card) => {
                const maskedNumber = await maskCardNumber(card.lastFourDigits);
                return sanitizeCard(card, maskedNumber);
                })
            );
        }

        if (!user) {
            return sendError(res, "Not Found", "User not found", 404);
        }
        
        // ✅ Fetch transactions with pagination + sorting
        // const [transactions, txCount] = await Promise.all([
        //     prisma.cryptoTransaction.groupBy({
        //         where: { userId:id },
        //         orderBy: { [txOrderBy]: txOrder },
        //         skip: (txPageNo - 1) * txPageSize,
        //         take: txPageSize,
        //         select: {
        //             id: true,
        //             amount: true,
        //             type: true,
        //             status: true,
        //             createdAt: true,
        //         }
        //     }),
        //     prisma.cryptoTransaction.count({ where: { userId:id } })
        // ]);
        const page = parseInt(typeof req.query.page === "string" ? req.query.page : "1");
        const limit = parseInt(typeof req.query.limit === "string" ? req.query.limit : "5");
        const skip = (page - 1) * limit;
        const history = await prisma.UserSession.findMany({
            where: { userId:id },
            orderBy: { lastActive: "desc" },
            skip,
            take: limit,
            select:{
                device: true,
                os: true,
                browser: true,
                ipAddress: true
            }
        });

        if (!history.length) {
            return sendSuccess(res, { sessions: [] }, "No session history found");
        }

        
        // const accounts = await getBankAccountsByUserId(id, ['bankName','accountType','nostroBankName','nostroAccountNumber']);

        // if (!accounts || accounts.length === 0) {
        //     return sendSuccess(res, [], 'No bank accounts found');
        // }
        
        // const userCards =  await prisma.userCard.findMany({
        //     where: { userId:id, isActive: true },
        //     orderBy: { createdAt: 'desc' },
        //     select:{
        //         cardNumber:true,
        //         cardType:true,
        //         lastFourDigits:true,
        //         isActive:true
        //     }
        // });

        // const sanitizedCards = await Promise.all(
        //     userCards.map(async (card) => {
        //         const maskedNumber = await maskCardNumber(card.lastFourDigits);
        //         return sanitizeCard(card, maskedNumber);
        //     })
        // );

        // ✅ Fetch history with pagination + sorting
        // const [history, historyCount] = await Promise.all([
        //     prisma.history.findMany({
        //         where: { userId: (userId) },
        //         orderBy: { [historyOrderBy]: historyOrder },
        //         skip: (historyPageNo - 1) * historyPageSize,
        //         take: historyPageSize,
        //         select: {
        //             id: true,
        //             action: true,
        //             description: true,
        //             createdAt: true,
        //         }
        //     }),
        //     prisma.history.count({ where: { userId: (userId) } })
        // ]);

        return sendSuccess(res, {
            user,
            history:history,
            // userdetail,
            // transactions: {
            //     data: transactions,
            //     count: txCount,
            //     page: txPageNo,
            //     limit: txPageSize,
            //     orderBy: txOrderBy,
            //     order: txOrder
            // },
            // history: {
            //     data: history,
            //     count: historyCount,
            //     page: historyPageNo,
            //     limit: historyPageSize,
            //     orderBy: historyOrderBy,
            //     order: historyOrder
            // }
        }, "User details fetched successfully");

    } catch (error) {
        console.log(error);
        logger.error("getUserDetails error:", error);
        return sendError(res, error.message || "Error fetching user details");
    }
}
