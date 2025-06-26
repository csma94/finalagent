"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../utils/logger");
const redis_1 = require("../config/redis");
class AnalyticsEngine {
    constructor() {
        this.queries = new Map();
        this.kpis = new Map();
        this.dashboards = new Map();
        this.queryCache = new Map();
        this.initializeDefaultQueries();
        this.initializeDefaultKPIs();
        this.startCacheCleanup();
    }
    initializeDefaultQueries() {
        const defaultQueries = [
            {
                id: 'shifts_by_status',
                name: 'Shifts by Status',
                description: 'Count of shifts grouped by status',
                query: `
          SELECT status, COUNT(*) as count
          FROM shifts
          WHERE created_at >= :startDate AND created_at <= :endDate
          GROUP BY status
          ORDER BY count DESC
        `,
                parameters: { startDate: null, endDate: null },
                cacheKey: 'shifts_by_status',
                cacheTTL: 300,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'agent_performance',
                name: 'Agent Performance Metrics',
                description: 'Performance metrics for agents including completion rates and quality scores',
                query: `
          SELECT 
            a.id as agent_id,
            u.username,
            COUNT(s.id) as total_shifts,
            COUNT(CASE WHEN s.status = 'completed' THEN 1 END) as completed_shifts,
            AVG(s.quality_score) as avg_quality_score,
            AVG(EXTRACT(EPOCH FROM (s.actual_end_time - s.actual_start_time))/3600) as avg_shift_duration
          FROM agents a
          JOIN users u ON a.user_id = u.id
          LEFT JOIN shifts s ON a.id = s.agent_id
          WHERE s.created_at >= :startDate AND s.created_at <= :endDate
          GROUP BY a.id, u.username
          ORDER BY avg_quality_score DESC
        `,
                parameters: { startDate: null, endDate: null },
                cacheKey: 'agent_performance',
                cacheTTL: 600,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'incident_trends',
                name: 'Incident Trends',
                description: 'Incident reports over time with severity breakdown',
                query: `
          SELECT 
            DATE_TRUNC('day', created_at) as date,
            priority,
            COUNT(*) as incident_count
          FROM reports
          WHERE type = 'incident' 
            AND created_at >= :startDate 
            AND created_at <= :endDate
          GROUP BY DATE_TRUNC('day', created_at), priority
          ORDER BY date, priority
        `,
                parameters: { startDate: null, endDate: null },
                cacheKey: 'incident_trends',
                cacheTTL: 900,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'site_utilization',
                name: 'Site Utilization',
                description: 'Site coverage and utilization metrics',
                query: `
          SELECT 
            st.id as site_id,
            st.name as site_name,
            COUNT(s.id) as total_shifts,
            SUM(EXTRACT(EPOCH FROM (s.actual_end_time - s.actual_start_time))/3600) as total_hours,
            AVG(s.quality_score) as avg_quality_score,
            COUNT(r.id) as total_reports
          FROM sites st
          LEFT JOIN shifts s ON st.id = s.site_id
          LEFT JOIN reports r ON st.id = r.site_id
          WHERE s.created_at >= :startDate AND s.created_at <= :endDate
          GROUP BY st.id, st.name
          ORDER BY total_hours DESC
        `,
                parameters: { startDate: null, endDate: null },
                cacheKey: 'site_utilization',
                cacheTTL: 1800,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ];
        defaultQueries.forEach(query => {
            this.queries.set(query.id, query);
        });
    }
    initializeDefaultKPIs() {
        const defaultKPIs = [
            {
                id: 'shift_completion_rate',
                name: 'Shift Completion Rate',
                description: 'Percentage of shifts completed successfully',
                formula: '(completed_shifts / total_shifts) * 100',
                target: 95,
                unit: '%',
                category: 'operational',
                frequency: 'daily',
                dependencies: ['shifts_by_status'],
                thresholds: {
                    critical: 80,
                    warning: 85,
                    good: 90,
                    excellent: 95,
                },
            },
            {
                id: 'average_response_time',
                name: 'Average Emergency Response Time',
                description: 'Average time to respond to emergency alerts',
                formula: 'AVG(response_time_minutes)',
                target: 5,
                unit: 'minutes',
                category: 'safety',
                frequency: 'real-time',
                dependencies: ['emergency_responses'],
                thresholds: {
                    critical: 15,
                    warning: 10,
                    good: 7,
                    excellent: 5,
                },
            },
            {
                id: 'agent_utilization',
                name: 'Agent Utilization Rate',
                description: 'Percentage of available agent hours utilized',
                formula: '(worked_hours / available_hours) * 100',
                target: 85,
                unit: '%',
                category: 'operational',
                frequency: 'daily',
                dependencies: ['agent_performance'],
                thresholds: {
                    critical: 60,
                    warning: 70,
                    good: 80,
                    excellent: 85,
                },
            },
            {
                id: 'incident_resolution_rate',
                name: 'Incident Resolution Rate',
                description: 'Percentage of incidents resolved within SLA',
                formula: '(resolved_within_sla / total_incidents) * 100',
                target: 90,
                unit: '%',
                category: 'quality',
                frequency: 'daily',
                dependencies: ['incident_trends'],
                thresholds: {
                    critical: 70,
                    warning: 80,
                    good: 85,
                    excellent: 90,
                },
            },
        ];
        defaultKPIs.forEach(kpi => {
            this.kpis.set(kpi.id, kpi);
        });
    }
    async executeQuery(queryId, parameters = {}, useCache = true) {
        try {
            const query = this.queries.get(queryId);
            if (!query) {
                throw new Error(`Query not found: ${queryId}`);
            }
            if (useCache && query.cacheKey) {
                const cached = await this.getCachedResult(query.cacheKey, parameters);
                if (cached) {
                    return cached;
                }
            }
            const startTime = Date.now();
            const data = await this.executeRawQuery(query.query, { ...query.parameters, ...parameters });
            const executionTime = Date.now() - startTime;
            const aggregations = this.calculateAggregations(data);
            const trends = this.calculateTrends(data);
            const result = {
                queryId,
                data,
                metadata: {
                    totalRows: data.length,
                    executionTime,
                    cacheHit: false,
                    generatedAt: new Date(),
                },
                aggregations,
                trends,
            };
            if (query.cacheKey && query.cacheTTL) {
                await this.cacheResult(query.cacheKey, parameters, result, query.cacheTTL);
            }
            logger_1.logger.info(`Analytics query executed: ${queryId}, rows: ${data.length}, time: ${executionTime}ms`);
            return result;
        }
        catch (error) {
            logger_1.logger.error(`Analytics query failed: ${queryId}`, error);
            throw error;
        }
    }
    async calculateKPI(kpiId, parameters = {}) {
        try {
            const kpi = this.kpis.get(kpiId);
            if (!kpi) {
                throw new Error(`KPI not found: ${kpiId}`);
            }
            const dependencyResults = await Promise.all(kpi.dependencies.map(dep => this.executeQuery(dep, parameters)));
            const value = await this.evaluateKPIFormula(kpi.formula, dependencyResults);
            const status = this.getKPIStatus(value, kpi.thresholds);
            const previousValue = await this.getPreviousKPIValue(kpiId, parameters);
            const trend = this.calculateKPITrend(value, previousValue);
            return {
                value,
                target: kpi.target,
                status,
                trend,
                previousValue,
            };
        }
        catch (error) {
            logger_1.logger.error(`KPI calculation failed: ${kpiId}`, error);
            throw error;
        }
    }
    async createDashboard(dashboard) {
        try {
            const dashboardId = `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const newDashboard = {
                ...dashboard,
                id: dashboardId,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            this.dashboards.set(dashboardId, newDashboard);
            await this.storeDashboard(newDashboard);
            logger_1.logger.info(`Dashboard created: ${dashboardId}`);
            return dashboardId;
        }
        catch (error) {
            logger_1.logger.error('Dashboard creation failed:', error);
            throw error;
        }
    }
    async generateReport(dashboardId, parameters = {}, format = 'json') {
        try {
            const dashboard = this.dashboards.get(dashboardId);
            if (!dashboard) {
                throw new Error(`Dashboard not found: ${dashboardId}`);
            }
            const widgetResults = await Promise.all(dashboard.widgets.map(async (widget) => {
                const result = await this.executeQuery(widget.queryId, parameters);
                return {
                    widget,
                    result,
                };
            }));
            const reportData = {
                dashboard,
                widgets: widgetResults,
                parameters,
                generatedAt: new Date(),
            };
            switch (format) {
                case 'json':
                    return reportData;
                case 'pdf':
                    return await this.generatePDFReport(reportData);
                case 'excel':
                    return await this.generateExcelReport(reportData);
                default:
                    throw new Error(`Unsupported format: ${format}`);
            }
        }
        catch (error) {
            logger_1.logger.error('Report generation failed:', error);
            throw error;
        }
    }
    async getRealtimeMetrics() {
        try {
            const realtimeKPIs = Array.from(this.kpis.values())
                .filter(kpi => kpi.frequency === 'real-time');
            const metrics = await Promise.all(realtimeKPIs.map(async (kpi) => {
                const result = await this.calculateKPI(kpi.id);
                return { [kpi.id]: result };
            }));
            return Object.assign({}, ...metrics);
        }
        catch (error) {
            logger_1.logger.error('Real-time metrics failed:', error);
            throw error;
        }
    }
    async executeRawQuery(query, parameters) {
        return [];
    }
    calculateAggregations(data) {
        if (data.length === 0)
            return {};
        const aggregations = {};
        const numericFields = this.getNumericFields(data[0]);
        numericFields.forEach(field => {
            const values = data.map(row => row[field]).filter(val => typeof val === 'number');
            if (values.length > 0) {
                aggregations[`${field}_sum`] = values.reduce((sum, val) => sum + val, 0);
                aggregations[`${field}_avg`] = aggregations[`${field}_sum`] / values.length;
                aggregations[`${field}_min`] = Math.min(...values);
                aggregations[`${field}_max`] = Math.max(...values);
            }
        });
        return aggregations;
    }
    calculateTrends(data) {
        return [];
    }
    getNumericFields(row) {
        return Object.keys(row).filter(key => typeof row[key] === 'number');
    }
    async getCachedResult(cacheKey, parameters) {
        try {
            const key = `analytics:${cacheKey}:${JSON.stringify(parameters)}`;
            const cached = await redis_1.redisClient.get(key);
            if (cached) {
                const result = JSON.parse(cached);
                result.metadata.cacheHit = true;
                return result;
            }
        }
        catch (error) {
            logger_1.logger.error('Cache retrieval failed:', error);
        }
        return null;
    }
    async cacheResult(cacheKey, parameters, result, ttl) {
        try {
            const key = `analytics:${cacheKey}:${JSON.stringify(parameters)}`;
            await redis_1.redisClient.setex(key, ttl, JSON.stringify(result));
        }
        catch (error) {
            logger_1.logger.error('Cache storage failed:', error);
        }
    }
    async evaluateKPIFormula(formula, dependencyResults) {
        return 0;
    }
    getKPIStatus(value, thresholds) {
        if (value >= thresholds.excellent)
            return 'excellent';
        if (value >= thresholds.good)
            return 'good';
        if (value >= thresholds.warning)
            return 'warning';
        return 'critical';
    }
    async getPreviousKPIValue(kpiId, parameters) {
        return undefined;
    }
    calculateKPITrend(current, previous) {
        if (!previous)
            return 'stable';
        const change = ((current - previous) / previous) * 100;
        if (Math.abs(change) < 5)
            return 'stable';
        return change > 0 ? 'up' : 'down';
    }
    async storeDashboard(dashboard) {
    }
    async generatePDFReport(reportData) {
        return Buffer.from('PDF report content');
    }
    async generateExcelReport(reportData) {
        return Buffer.from('Excel report content');
    }
    startCacheCleanup() {
        setInterval(() => {
            this.cleanupCache();
        }, 60 * 60 * 1000);
    }
    cleanupCache() {
        const now = Date.now();
        for (const [key, value] of this.queryCache.entries()) {
            if (value.expiry <= now) {
                this.queryCache.delete(key);
            }
        }
    }
}
exports.default = AnalyticsEngine;
//# sourceMappingURL=analyticsEngine.js.map