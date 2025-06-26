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
export declare class AnalyticsService {
    private prisma;
    constructor();
    getBasicAnalytics(query: AnalyticsQuery): Promise<AnalyticsResult>;
    getShiftAnalytics(siteId?: string, dateRange?: {
        start: Date;
        end: Date;
    }): Promise<any>;
    getIncidentAnalytics(siteId?: string, dateRange?: {
        start: Date;
        end: Date;
    }): Promise<any>;
    getAgentAnalytics(agentId?: string, dateRange?: {
        start: Date;
        end: Date;
    }): Promise<any>;
    getClientFeedbackAnalytics(clientId?: string): Promise<any>;
    exportAnalyticsData(query: AnalyticsQuery, format: 'csv' | 'json'): Promise<string>;
    private calculateAverageResponseTime;
    private getAgentPerformance;
    private calculateSiteUtilization;
    private calculateRevenueMetrics;
    private calculateAverageShiftDuration;
    private calculateAverageIncidentResponseTime;
    private calculateResolutionRate;
    private calculateAttendanceRate;
    private calculateRatingDistribution;
    private convertToCSV;
}
//# sourceMappingURL=analyticsService.d.ts.map