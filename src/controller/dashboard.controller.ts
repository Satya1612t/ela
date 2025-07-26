import { Request, Response } from "express";
import { prisma } from "../config/db";
import dayjs from "dayjs";
import { startOfYear, endOfYear } from "date-fns";

export const getUserAnalyticsSummary = async (req: Request, res: Response) => {
  try {
    const startOfToday = dayjs().startOf("day").toDate();
    const startOfMonth = dayjs().startOf("month").toDate();

    const [totalUsers, totalAdmins, totalCoadmins, usersToday, usersThisMonth] =
      await Promise.all([
        prisma.user.count(), // total users
        prisma.user.count({ where: { role: "ADMIN" } }),
        prisma.user.count({ where: { role: "COADMIN" } }),
        prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
        prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      ]);

    return res.status(200).json({
      totalUsers,
      totalAdmins,
      totalCoadmins,
      usersToday,
      usersThisMonth,
    });
  } catch (error) {
    console.error("Error fetching user summary:", error);
    return res.status(500).json({ message: "Failed to fetch user summary." });
  }
};


export const getMonthlyUserRegistration = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const data = await prisma.$queryRaw<{ month: string; count: bigint }[]>`
      SELECT
        TO_CHAR("createdAt", 'YYYY-MM') AS month,
        COUNT(*) AS count
      FROM "User"
      GROUP BY month
      ORDER BY month ASC;
    `;

    const formatted = data.map((item) => ({
      month: item.month,
      count: Number(item.count), // ✅ Convert BigInt to number
    }));

    return res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error("Error fetching monthly user registrations:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch monthly registration data.",
    });
  }
};


export const getApplicationCountByStatus = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const statusCounts = await prisma.application.groupBy({
      by: ["applicationStatus"],
      _count: {
        applicationStatus: true,
      },
    });

    const formattedCounts = statusCounts.reduce((acc, curr) => {
      acc[curr.applicationStatus] = curr._count.applicationStatus;
      return acc;
    }, {} as Record<string, number>);

    return res.status(200).json({
      success: true,
      data: formattedCounts,
    });
  } catch (error) {
    console.error("Error fetching application counts by status:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


export const getApplicationCountByService = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const serviceCounts = await prisma.application.groupBy({
      by: ["serviceId"],
      _count: {
        serviceId: true,
      },
    });

    const serviceDetails = await prisma.service.findMany({
      where: {
        id: {
          in: serviceCounts.map((s) => s.serviceId),
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const serviceNameMap = serviceDetails.reduce((acc, curr) => {
      acc[curr.id] = curr.name;
      return acc;
    }, {} as Record<string, string>);

    const result = serviceCounts.map((entry) => ({
      serviceId: entry.serviceId,
      serviceName: serviceNameMap[entry.serviceId] || "Unknown",
      count: entry._count.serviceId,
    }));

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching application count by service:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


export const getApplicationTrendByMonth = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const startDate = startOfYear(new Date(year, 0));
    const endDate = endOfYear(new Date(year, 11));

    const rawData = await prisma.$queryRaw<{ month: number; count: bigint }[]>`
      SELECT EXTRACT(MONTH FROM "createdAt") AS month,
             COUNT(*) as count
      FROM "Application"
      WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
      GROUP BY month
      ORDER BY month;
    `;

    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const monthCounts = new Array(12).fill(0);

    rawData.forEach(({ month, count }) => {
      monthCounts[month - 1] = Number(count); // ✅ Convert BigInt to Number
    });

    return res.status(200).json({
      success: true,
      year,
      data: {
        labels: months,
        values: monthCounts,
      },
    });
  } catch (error) {
    console.error("Error fetching application trend by month:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


export const getPaymentSummary = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const totalPayments = await prisma.payment.count();

    const successfulPayments = await prisma.payment.findMany({
      where: {
        status: "SUCCESS",
      },
      select: {
        amount: true,
      },
    });

    const totalRevenue = successfulPayments.reduce((sum, payment) => {
      return sum + Number(payment.amount);
    }, 0);

    const statusCounts = await prisma.payment.groupBy({
      by: ["status"],
      _count: {
        status: true,
      },
    });

    const counts = {
      SUCCESS: 0,
      FAILED: 0,
      PENDING: 0,
    };

    statusCounts.forEach((entry) => {
      counts[entry.status] = entry._count.status;
    });

    return res.status(200).json({
      success: true,
      data: {
        totalPayments,
        totalRevenue,
        statusBreakdown: counts,
      },
    });
  } catch (error) {
    console.error("Error fetching payment summary:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


export const getRevenueAndCountByPaymentType = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const result = await prisma.payment.groupBy({
      by: ["paymentType"],
      _count: {
        paymentType: true,
      },
      _sum: {
        amount: true,
      },
    });

    const formatted = result.map((entry) => ({
      paymentType: entry.paymentType || "UNSPECIFIED",
      count: entry._count.paymentType,
      totalAmount: Number(entry._sum.amount ?? 0),
    }));

    return res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error("Error fetching payment data by type:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


export const getMonthlyRevenueTrend = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const startDate = startOfYear(new Date(year, 0));
    const endDate = endOfYear(new Date(year, 11));

    const rawData = await prisma.$queryRaw<{ month: number; total: number }[]>`
      SELECT EXTRACT(MONTH FROM "paymentDate") AS month,
             SUM(CAST("amount" AS DOUBLE PRECISION)) AS total
      FROM "Payment"
      WHERE "status" = 'SUCCESS'
        AND "paymentDate" >= ${startDate}
        AND "paymentDate" <= ${endDate}
      GROUP BY month
      ORDER BY month;
    `;

    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const revenueMap = new Array(12).fill(0);
    rawData.forEach(({ month, total }) => {
      revenueMap[month - 1] = total;
    });

    return res.status(200).json({
      success: true,
      year,
      data: {
        labels: months,
        values: revenueMap,
      },
    });
  } catch (error) {
    console.error("Error fetching monthly revenue trend:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};