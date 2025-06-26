"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
class AnalyticsService {
    constructor() {
        this.prisma = prisma;
    }
    async getBasicAnalytics(query) {
        try {
            const whereClause = {
                createdAt: {
                    gte: query.startDate,
                    lte: query.endDate,
                },
            };
            if (query.siteId) {
                whereClause.siteId = query.siteId;
            }
            if (query.agentId) {
                whereClause.agentId = query.agentId;
            }
            const [totalShifts, completedShifts, totalIncidents, resolvedIncidents] = await Promise.all([
                this.prisma.shift.count({ where: whereClause }),
                this.prisma.shift.count({
                    where: {
                        ...whereClause,
                        status: 'COMPLETED'
                    }
                }),
                this.prisma.incident.count({ where: whereClause }),
                this.prisma.incident.count({
                    where: {
                        ...whereClause,
                        status: 'RESOLVED'
                    }
                }),
            ]);
            const averageResponseTime = await this.calculateAverageResponseTime(whereClause);
            const agentPerformance = await this.getAgentPerformance(query);
            const siteUtilization = await this.calculateSiteUtilization(query);
            const revenueMetrics = await this.calculateRevenueMetrics(query);
            return {
                totalShifts,
                completedShifts,
                totalIncidents,
                resolvedIncidents,
                averageResponseTime,
                agentPerformance,
                siteUtilization,
                revenueMetrics,
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting basic analytics:', error);
            throw new Error('Failed to get analytics');
        }
    }
    async getShiftAnalytics(siteId, dateRange) {
        try {
            const whereClause = {};
            if (siteId) {
                whereClause.siteId = siteId;
            }
            if (dateRange) {
                whereClause.createdAt = {
                    gte: dateRange.start,
                    lte: dateRange.end,
                };
            }
            const shifts = await this.prisma.shift.findMany({
                where: whereClause,
                include: {
                    agent: {
                        include: {
                            user: true,
                        },
                    },
                },
            });
            const shiftStats = shifts.reduce((acc, shift) => {
                const status = shift.status;
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {});
            return {
                totalShifts: shifts.length,
                shiftDistribution: shiftStats,
                averageShiftDuration: this.calculateAverageShiftDuration(shifts),
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting shift analytics:', error);
            throw new Error('Failed to get shift analytics');
        }
    }
    async getIncidentAnalytics(siteId, dateRange) {
        try {
            const whereClause = {};
            if (siteId) {
                whereClause.siteId = siteId;
            }
            if (dateRange) {
                whereClause.createdAt = {
                    gte: dateRange.start,
                    lte: dateRange.end,
                };
            }
            const incidents = await this.prisma.incident.findMany({
                where: whereClause,
                include: {
                    assignee: true,
                },
            });
            const incidentStats = incidents.reduce((acc, incident) => {
                const type = incident.type;
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {});
            return {
                totalIncidents: incidents.length,
                incidentTypes: incidentStats,
                averageResponseTime: this.calculateAverageIncidentResponseTime(incidents),
                resolutionRate: this.calculateResolutionRate(incidents),
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting incident analytics:', error);
            throw new Error('Failed to get incident analytics');
        }
    }
    async getAgentAnalytics(agentId, dateRange) {
        try {
            const whereClause = {};
            if (agentId) {
                whereClause.agentId = agentId;
            }
            if (dateRange) {
                whereClause.createdAt = {
                    gte: dateRange.start,
                    lte: dateRange.end,
                };
            }
            const [shifts, incidents, attendance] = await Promise.all([
                this.prisma.shift.findMany({
                    where: whereClause,
                    include: {
                        agent: {
                            include: {
                                user: true,
                            },
                        },
                    },
                }),
                this.prisma.incident.findMany({
                    where: whereClause,
                }),
                this.prisma.attendance.findMany({
                    where: whereClause,
                }),
            ]);
            return {
                totalShifts: shifts.length,
                completedShifts: shifts.filter(s => s.status === 'COMPLETED').length,
                totalIncidents: incidents.length,
                resolvedIncidents: incidents.filter(i => i.status === 'RESOLVED').length,
                attendanceRate: this.calculateAttendanceRate(attendance),
                averageShiftDuration: this.calculateAverageShiftDuration(shifts),
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting agent analytics:', error);
            throw new Error('Failed to get agent analytics');
        }
    }
    async getClientFeedbackAnalytics(clientId) {
        try {
            const whereClause = {};
            if (clientId) {
                whereClause.clientId = clientId;
            }
            const feedback = await this.prisma.clientFeedback.findMany({
                where: whereClause,
            });
            const validRatings = feedback.filter(f => f.rating !== null && f.rating !== undefined);
            const averageRating = validRatings.length > 0
                ? validRatings.reduce((sum, f) => sum + f.rating, 0) / validRatings.length
                : 0;
            return {
                totalFeedback: feedback.length,
                averageRating,
                ratingDistribution: this.calculateRatingDistribution(feedback),
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting client feedback analytics:', error);
            throw new Error('Failed to get client feedback analytics');
        }
    }
    async exportAnalyticsData(query, format) {
        try {
            const data = await this.getBasicAnalytics(query);
            if (format === 'json') {
                return JSON.stringify(data, null, 2);
            }
            else {
                return this.convertToCSV(data);
            }
        }
        catch (error) {
            logger_1.logger.error('Error exporting analytics data:', error);
            throw new Error('Failed to export analytics data');
        }
    }
    async calculateAverageResponseTime(whereClause) {
        try {
            const incidents = await this.prisma.incident.findMany({
                where: whereClause,
                select: { responseTime: true },
            });
            const validResponseTimes = incidents
                .map(incident => incident.responseTime)
                .filter(time => time !== null && time !== undefined);
            if (validResponseTimes.length === 0)
                return 0;
            return validResponseTimes.reduce((sum, time) => sum + time, 0) / validResponseTimes.length;
        }
        catch (error) {
            logger_1.logger.error('Error calculating average response time:', error);
            return 0;
        }
    }
    async getAgentPerformance(query) {
        try {
            const whereClause = {};
            if (query.siteId) {
                const shiftsWithSite = await this.prisma.shift.findMany({
                    where: { siteId: query.siteId },
                    select: { agentId: true },
                });
                const agentIds = [...new Set(shiftsWithSite.map(s => s.agentId).filter(Boolean))];
                if (agentIds.length > 0) {
                    whereClause.id = { in: agentIds };
                }
                else {
                    return [];
                }
            }
            const agents = await this.prisma.agent.findMany({
                where: whereClause,
                include: {
                    user: true,
                    shifts: {
                        where: {
                            createdAt: {
                                gte: query.startDate,
                                lte: query.endDate,
                            },
                        },
                    },
                },
            });
            return agents.map(agent => ({
                id: agent.id,
                name: `${agent.user.firstName || ''} ${agent.user.lastName || ''}`.trim() || agent.user.username,
                completedShifts: agent.shifts.filter(shift => shift.status === 'COMPLETED').length,
                totalShifts: agent.shifts.length,
                performance: agent.shifts.length > 0
                    ? (agent.shifts.filter(shift => shift.status === 'COMPLETED').length / agent.shifts.length) * 100
                    : 0,
            }));
        }
        catch (error) {
            logger_1.logger.error('Error getting agent performance:', error);
            return [];
        }
    }
    async calculateSiteUtilization(query) {
        try {
            const whereClause = {
                createdAt: {
                    gte: query.startDate,
                    lte: query.endDate,
                },
            };
            if (query.siteId) {
                whereClause.siteId = query.siteId;
            }
            const totalShifts = await this.prisma.shift.count({ where: whereClause });
            const completedShifts = await this.prisma.shift.count({
                where: { ...whereClause, status: 'COMPLETED' },
            });
            return totalShifts > 0 ? (completedShifts / totalShifts) * 100 : 0;
        }
        catch (error) {
            logger_1.logger.error('Error calculating site utilization:', error);
            return 0;
        }
    }
    async calculateRevenueMetrics(query) {
        try {
            return {
                totalRevenue: 0,
                averageRevenuePerShift: 0,
                revenueGrowth: 0,
            };
        }
        catch (error) {
            logger_1.logger.error('Error calculating revenue metrics:', error);
            return {
                totalRevenue: 0,
                averageRevenuePerShift: 0,
                revenueGrowth: 0,
            };
        }
    }
    calculateAverageShiftDuration(shifts) {
        if (shifts.length === 0)
            return 0;
        const durations = shifts
            .filter(shift => shift.startTime && shift.endTime)
            .map(shift => {
            const start = new Date(shift.startTime);
            const end = new Date(shift.endTime);
            return end.getTime() - start.getTime();
        });
        if (durations.length === 0)
            return 0;
        return durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
    }
    calculateAverageIncidentResponseTime(incidents) {
        const validResponseTimes = incidents
            .map(incident => incident.responseTime)
            .filter(time => time !== null && time !== undefined);
        if (validResponseTimes.length === 0)
            return 0;
        return validResponseTimes.reduce((sum, time) => sum + time, 0) / validResponseTimes.length;
    }
    calculateResolutionRate(incidents) {
        if (incidents.length === 0)
            return 0;
        const resolvedIncidents = incidents.filter(incident => incident.status === 'RESOLVED').length;
        return (resolvedIncidents / incidents.length) * 100;
    }
    calculateAttendanceRate(attendance) {
        if (attendance.length === 0)
            return 0;
        const presentAttendance = attendance.filter(a => a.status === 'CLOCKED_IN').length;
        return (presentAttendance / attendance.length) * 100;
    }
    calculateRatingDistribution(feedback) {
        return feedback.reduce((acc, f) => {
            const rating = f.rating?.toString() || 'unknown';
            acc[rating] = (acc[rating] || 0) + 1;
            return acc;
        }, {});
    }
    convertToCSV(data) {
        const headers = Object.keys(data);
        const csvRows = [headers.join(',')];
        const values = headers.map(header => {
            const value = data[header];
            if (typeof value === 'object') {
                return JSON.stringify(value);
            }
            return value;
        });
        csvRows.push(values.join(','));
        return csvRows.join('\n');
    }
}
exports.AnalyticsService = AnalyticsService;
//# sourceMappingURL=analyticsService.js.map