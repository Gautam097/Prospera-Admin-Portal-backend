import prisma from '../lib/prisma.js';
import moment from "moment";

const weekDays = () => {
    return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
}

export async function getGraphInformation(filter, year = null, search) {
    let data;

    switch (filter) {
        //  Weekly Data
        case "weekly": {
            const startOfWeek = moment().utc().startOf("week").toDate();
            const endOfWeek = moment().utc().endOf("week").toDate();

            data = await prisma.staking.groupBy({
                by: ["stakeStartDate"], 
                where: {
                    status: search.status,
                    userId: search.userId,   // Filter by user
                    stakeStartDate: {
                        gte: startOfWeek,
                        lte: endOfWeek
                    }
                },
                _sum: {
                    accruedInterest: true,
                    currentValue: true
                }
            });

            return weekDays().map(day => {
                const found = data.find(d => moment(d.stakeStartDate).format("dddd") === day);
                return {
                    day,
                    accruedInterest: found?._sum.accruedInterest || 0,
                    currentValue: found?._sum.currentValue || 0
                };
            });
        }

        //  Monthly Data
        case "monthly": {
            const startDate = year 
                ? moment.utc(`${year}-01-01`).startOf("year") 
                : moment().utc().startOf("year");
            const endDate = startDate.clone().endOf("year");

            data = await prisma.$queryRaw`
                SELECT TO_CHAR("stakeStartDate", 'Month') as month,
                       SUM("accruedInterest") as total_interest,
                       SUM("currentValue") as total_value
                FROM "staking"
                WHERE "status" = ${search.status}::"Status"
                  AND "userId" = ${search.userId}
                  AND "stakeStartDate" BETWEEN ${startDate.toDate()} AND ${endDate.toDate()}
                GROUP BY month
                ORDER BY MIN("stakeStartDate")
            `;

            return data.map(row => ({
                month: row.month.trim(),
                accruedInterest: Number(row.total_interest) || 0,
                currentValue: Number(row.total_value) || 0
            }));
        }

        //  Yearly Data
        case "yearly": {
            const startDate = moment().utc().subtract(11, "year").startOf("year").toDate();
            const endDate = moment().utc().endOf("year").toDate();

            data = await prisma.$queryRaw`
                SELECT TO_CHAR("stakeStartDate", 'YYYY') as year,
                       SUM("accruedInterest") as total_interest,
                       SUM("currentValue") as total_value
                FROM "staking"
                WHERE "status" = ${search.status}::"Status"
                  AND "userId" = ${search.userId}
                  AND "stakeStartDate" BETWEEN ${startDate} AND ${endDate}
                GROUP BY year
                ORDER BY year
            `;

            return data.map(row => ({
                year: row.year,
                accruedInterest: Number(row.total_interest) || 0,
                currentValue: Number(row.total_value) || 0
            }));
        }
    }

    return data;
}
