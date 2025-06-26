import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface AnalyticsQuery {
  startDate: Date;
  endDate: Date;
  siteId?: string;
  agentId?: string;
  type?: string;
}

export interface AnalyticsResult {
  totalShifts: number;
  completedShifts: number;
  totalIncidents: number;
  resolvedIncidents: number;
  averageResponseTime: number;
  agentPerformance: any[];
  siteUtilization: number;
  revenueMetrics: any;
}

export class AnalyticsService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async getBasicAnalytics(query: AnalyticsQuery): Promise<AnalyticsResult> {
    try {
      const whereClause: any = {
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
            status: 'COMPLETED' as any 
          } 
        }),
        this.prisma.incident.count({ where: whereClause }),
        this.prisma.incident.count({ 
          where: { 
            ...whereClause, 
            status: 'RESOLVED' as any 
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
    } catch (error) {
      logger.error('Error getting basic analytics:', error);
      throw new Error('Failed to get analytics');
    }
  }

  async getShiftAnalytics(siteId?: string, dateRange?: { start: Date; end: Date }): Promise<any> {
    try {
      const whereClause: any = {};
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
      }, {} as Record<string, number>);

      return {
        totalShifts: shifts.length,
        shiftDistribution: shiftStats,
        averageShiftDuration: this.calculateAverageShiftDuration(shifts),
      };
    } catch (error) {
      logger.error('Error getting shift analytics:', error);
      throw new Error('Failed to get shift analytics');
    }
  }

  async getIncidentAnalytics(siteId?: string, dateRange?: { start: Date; end: Date }): Promise<any> {
    try {
      const whereClause: any = {};
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
      }, {} as Record<string, number>);

      return {
        totalIncidents: incidents.length,
        incidentTypes: incidentStats,
        averageResponseTime: this.calculateAverageIncidentResponseTime(incidents),
        resolutionRate: this.calculateResolutionRate(incidents),
      };
    } catch (error) {
      logger.error('Error getting incident analytics:', error);
      throw new Error('Failed to get incident analytics');
    }
  }

  async getAgentAnalytics(agentId?: string, dateRange?: { start: Date; end: Date }): Promise<any> {
    try {
      const whereClause: any = {};
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
    } catch (error) {
      logger.error('Error getting agent analytics:', error);
      throw new Error('Failed to get agent analytics');
    }
  }

  async getClientFeedbackAnalytics(clientId?: string): Promise<any> {
    try {
      const whereClause: any = {};
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
    } catch (error) {
      logger.error('Error getting client feedback analytics:', error);
      throw new Error('Failed to get client feedback analytics');
    }
  }

  async exportAnalyticsData(query: AnalyticsQuery, format: 'csv' | 'json'): Promise<string> {
    try {
      const data = await this.getBasicAnalytics(query);

      if (format === 'json') {
        return JSON.stringify(data, null, 2);
      } else {
        return this.convertToCSV(data);
      }
    } catch (error) {
      logger.error('Error exporting analytics data:', error);
      throw new Error('Failed to export analytics data');
    }
  }

  private async calculateAverageResponseTime(whereClause: any): Promise<number> {
    try {
      const incidents = await this.prisma.incident.findMany({
        where: whereClause,
        select: { responseTime: true },
      });

      const validResponseTimes = incidents
        .map(incident => incident.responseTime)
        .filter(time => time !== null && time !== undefined) as number[];

      if (validResponseTimes.length === 0) return 0;

      return validResponseTimes.reduce((sum, time) => sum + time, 0) / validResponseTimes.length;
    } catch (error) {
      logger.error('Error calculating average response time:', error);
      return 0;
    }
  }

  private async getAgentPerformance(query: AnalyticsQuery): Promise<any[]> {
    try {
      const whereClause: any = {};
      if (query.siteId) {
        // Agents don't have siteId directly, we need to query through shifts
        const shiftsWithSite = await this.prisma.shift.findMany({
          where: { siteId: query.siteId },
          select: { agentId: true },
        });
        const agentIds = [...new Set(shiftsWithSite.map(s => s.agentId).filter(Boolean))];
        if (agentIds.length > 0) {
          whereClause.id = { in: agentIds };
        } else {
          return []; // No agents for this site
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
    } catch (error) {
      logger.error('Error getting agent performance:', error);
      return [];
    }
  }

  private async calculateSiteUtilization(query: AnalyticsQuery): Promise<number> {
    try {
      const whereClause: any = {
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
        where: { ...whereClause, status: 'COMPLETED' as any },
      });

      return totalShifts > 0 ? (completedShifts / totalShifts) * 100 : 0;
    } catch (error) {
      logger.error('Error calculating site utilization:', error);
      return 0;
    }
  }

  private async calculateRevenueMetrics(query: AnalyticsQuery): Promise<any> {
    try {
      // This would integrate with actual billing/invoicing data
      return {
        totalRevenue: 0,
        averageRevenuePerShift: 0,
        revenueGrowth: 0,
      };
    } catch (error) {
      logger.error('Error calculating revenue metrics:', error);
      return {
        totalRevenue: 0,
        averageRevenuePerShift: 0,
        revenueGrowth: 0,
      };
    }
  }

  private calculateAverageShiftDuration(shifts: any[]): number {
    if (shifts.length === 0) return 0;

    const durations = shifts
      .filter(shift => shift.startTime && shift.endTime)
      .map(shift => {
        const start = new Date(shift.startTime);
        const end = new Date(shift.endTime);
        return end.getTime() - start.getTime();
      });

    if (durations.length === 0) return 0;

    return durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
  }

  private calculateAverageIncidentResponseTime(incidents: any[]): number {
    const validResponseTimes = incidents
      .map(incident => incident.responseTime)
      .filter(time => time !== null && time !== undefined) as number[];

    if (validResponseTimes.length === 0) return 0;

    return validResponseTimes.reduce((sum, time) => sum + time, 0) / validResponseTimes.length;
  }

  private calculateResolutionRate(incidents: any[]): number {
    if (incidents.length === 0) return 0;

    const resolvedIncidents = incidents.filter(incident => incident.status === 'RESOLVED').length;
    return (resolvedIncidents / incidents.length) * 100;
  }

  private calculateAttendanceRate(attendance: any[]): number {
    if (attendance.length === 0) return 0;

    const presentAttendance = attendance.filter(a => a.status === 'CLOCKED_IN').length;
    return (presentAttendance / attendance.length) * 100;
  }

  private calculateRatingDistribution(feedback: any[]): Record<string, number> {
    return feedback.reduce((acc, f) => {
      const rating = f.rating?.toString() || 'unknown';
      acc[rating] = (acc[rating] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private convertToCSV(data: any): string {
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