import prisma from '../lib/prisma.js';
import { Decimal } from '@prisma/client/runtime/library.js';

export async function createStaking(data) {
    const {
        userId,
        stakeId,
        assetName,
        lockUpPeriod,
        currentValue,
        amountToStake,
        rewardClaiming,
        stakeEndDate,
        interestPeriod = null,
        estAPY,
        estimatedInterests,
        status = 'ACTIVE',
        redemptionDate = null
    } = data;

    try {
        const staking = await prisma.staking.create({
            data: {
                userId,
                stakeId,
                assetName,
                lockUpPeriod,
                currentValue,
                amountToStake: new Decimal(amountToStake),
                rewardClaiming,
                stakeEndDate,
                interestPeriod,
                estAPY: new Decimal(estAPY),
                estimatedInterests: new Decimal(estimatedInterests),
                status,
                redemptionDate
            }
        });

        return staking;
    } catch (error) {
        console.error('Failed to create staking:', error);
        throw new Error('Staking creation failed');
    }
}