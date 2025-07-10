import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { EventEmitter } from 'events';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/integration.log' }),
    new winston.transports.Console()
  ]
});

const prisma = new PrismaClient();

export class IntegrationService extends EventEmitter {
  private static instance: IntegrationService;
  private webhookEndpoints: Map<string, string> = new Map();
  private apiKeys: Map<string, string> = new Map();

  private constructor() {
    super();
    this.initializeIntegrations();
  }

  public static getInstance(): IntegrationService {
    if (!IntegrationService.instance) {
      IntegrationService.instance = new IntegrationService();
    }
    return IntegrationService.instance;
  }

  private async initializeIntegrations() {
    try {
      // Load integration configurations from database
      const integrations = await prisma.integration.findMany({
        where: { isActive: true },
      });

      for (const integration of integrations) {
        if (integration.webhookUrl) {
          this.webhookEndpoints.set(integration.type, integration.webhookUrl);
        }
        if (integration.apiKey) {
          this.apiKeys.set(integration.type, integration.apiKey);
        }
      }

      logger.info('Integration service initialized with', { activeIntegrations: integrations.length });
    } catch (error) {
      logger.error('Failed to initialize integrations:', error);
    }
  }

  // Weather API Integration
  public async getWeatherData(latitude: number, longitude: number) {
    try {
      const apiKey = this.apiKeys.get('WEATHER_API');
      if (!apiKey) {
        throw new Error('Weather API key not configured');
      }

      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`
      );

      return {
        temperature: response.data.main.temp,
        condition: response.data.weather[0].main,
        description: response.data.weather[0].description,
        humidity: response.data.main.humidity,
        windSpeed: response.data.wind.speed,
        visibility: response.data.visibility,
      };
    } catch (error) {
      logger.error('Weather API error:', error);
      throw new Error('Failed to fetch weather data');
    }
  }

  // SMS Integration (Twilio)
  public async sendSMS(to: string, message: string) {
    try {
      const apiKey = this.apiKeys.get('TWILIO');
      const accountSid = process.env['TWILIO_ACCOUNT_SID'];
      const authToken = process.env['TWILIO_AUTH_TOKEN'];
      const fromNumber = process.env['TWILIO_PHONE_NUMBER'];

      if (!accountSid || !authToken || !fromNumber) {
        throw new Error('Twilio configuration missing');
      }

      const response = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        new URLSearchParams({
          To: to,
          From: fromNumber,
          Body: message,
        }),
        {
          auth: {
            username: accountSid,
            password: authToken,
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return {
        messageId: response.data.sid,
        status: response.data.status,
        to: response.data.to,
      };
    } catch (error) {
      logger.error('SMS sending error:', error);
      throw new Error('Failed to send SMS');
    }
  }

  // Email Integration (SendGrid)
  public async sendEmail(to: string, subject: string, content: string, isHtml: boolean = false) {
    try {
      const apiKey = this.apiKeys.get('SENDGRID');
      if (!apiKey) {
        throw new Error('SendGrid API key not configured');
      }

      const response = await axios.post(
        'https://api.sendgrid.com/v3/mail/send',
        {
          personalizations: [
            {
              to: [{ email: to }],
              subject: subject,
            },
          ],
          from: {
            email: process.env['FROM_EMAIL'] || 'noreply@bahinlink.com',
            name: 'BahinLink Security',
          },
          content: [
            {
              type: isHtml ? 'text/html' : 'text/plain',
              value: content,
            },
          ],
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        messageId: response.headers['x-message-id'],
        status: 'sent',
      };
    } catch (error) {
      logger.error('Email sending error:', error);
      throw new Error('Failed to send email');
    }
  }

  // Push Notification Integration (Firebase)
  public async sendPushNotification(deviceTokens: string[], title: string, body: string, data?: any) {
    try {
      const serverKey = this.apiKeys.get('FIREBASE');
      if (!serverKey) {
        throw new Error('Firebase server key not configured');
      }

      const response = await axios.post(
        'https://fcm.googleapis.com/fcm/send',
        {
          registration_ids: deviceTokens,
          notification: {
            title,
            body,
            icon: 'ic_notification',
            sound: 'default',
          },
          data: data || {},
          priority: 'high',
        },
        {
          headers: {
            'Authorization': `key=${serverKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: response.data.success,
        failure: response.data.failure,
        results: response.data.results,
      };
    } catch (error) {
      logger.error('Push notification error:', error);
      throw new Error('Failed to send push notification');
    }
  }

  // Webhook Integration
  public async sendWebhook(type: string, event: string, data: any) {
    try {
      const webhookUrl = this.webhookEndpoints.get(type);
      if (!webhookUrl) {
        logger.info(`No webhook configured for type: ${type}`);
        return;
      }

      const payload = {
        event,
        timestamp: new Date().toISOString(),
        data,
      };

      const response = await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-BahinLink-Event': event,
        },
        timeout: 10000,
      });

      logger.info(`Webhook sent successfully for ${type}:${event}`);
      return response.data;
    } catch (error) {
      logger.error(`Webhook error for ${type}:${event}:`, error);
      throw new Error('Failed to send webhook');
    }
  }

  // Geolocation Services
  public async reverseGeocode(latitude: number, longitude: number) {
    try {
      const apiKey = this.apiKeys.get('GOOGLE_MAPS');
      if (!apiKey) {
        throw new Error('Google Maps API key not configured');
      }

      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
      );

      if (response.data.status !== 'OK') {
        throw new Error('Geocoding failed');
      }

      const result = response.data.results[0];
      return {
        address: result.formatted_address,
        components: result.address_components,
        placeId: result.place_id,
      };
    } catch (error) {
      logger.error('Reverse geocoding error:', error);
      throw new Error('Failed to reverse geocode location');
    }
  }

  // Emergency Services Integration
  public async notifyEmergencyServices(incident: any) {
    try {
      // Send notifications to multiple channels

      // SMS to emergency contacts
      if (incident.emergencyContacts) {
        for (const contact of incident.emergencyContacts) {
          await this.sendSMS(
            contact.phone,
            `EMERGENCY ALERT: ${incident.type} reported at ${incident.location}. Incident ID: ${incident.id}`
          );
        }
      }

      // Email to management
      if (incident.managementEmails) {
        for (const email of incident.managementEmails) {
          await this.sendEmail(
            email,
            `Emergency Incident Alert - ${incident.type}`,
            `An emergency incident has been reported:\n\nType: ${incident.type}\nLocation: ${incident.location}\nTime: ${incident.timestamp}\nReported by: ${incident.reportedBy}\n\nPlease respond immediately.`
          );
        }
      }

      // Push notifications to mobile devices
      if (incident.deviceTokens) {
        await this.sendPushNotification(
          incident.deviceTokens,
          'Emergency Alert',
          `${incident.type} at ${incident.location}`,
          { incidentId: incident.id, type: 'emergency' }
        );
      }

      // Webhook to external systems
      await this.sendWebhook('EMERGENCY', 'incident.created', incident);

      logger.info('Emergency notifications sent', { incidentId: incident.id });
    } catch (error) {
      logger.error('Emergency notification error:', error);
      throw new Error('Failed to notify emergency services');
    }
  }

  // Analytics Integration
  public async sendAnalyticsEvent(event: string, properties: any) {
    try {
      const webhookUrl = this.webhookEndpoints.get('ANALYTICS');
      if (!webhookUrl) {
        return;
      }

      await this.sendWebhook('ANALYTICS', event, {
        event,
        properties,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Analytics event error:', error);
    }
  }

  // File Storage Integration (AWS S3)
  public async uploadFile(file: Buffer, fileName: string, contentType: string) {
    try {
      const AWS = require('aws-sdk');
      const s3 = new AWS.S3({
        accessKeyId: process.env['AWS_ACCESS_KEY_ID'],
        secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY'],
        region: process.env['AWS_REGION'],
      });

      const params = {
        Bucket: process.env['AWS_S3_BUCKET'],
        Key: fileName,
        Body: file,
        ContentType: contentType,
        ACL: 'private',
      };

      const result = await s3.upload(params).promise();
      return {
        url: result.Location,
        key: result.Key,
        bucket: result.Bucket,
      };
    } catch (error) {
      console.error('File upload error:', error);
      throw new Error('Failed to upload file');
    }
  }

  // Update integration configuration
  public async updateIntegration(type: string, config: any) {
    try {
      const existingIntegration = await prisma.integration.findFirst({
        where: { type },
      });

      if (existingIntegration) {
        await prisma.integration.update({
          where: { id: existingIntegration.id },
          data: {
            ...config,
            updatedAt: new Date(),
          },
        });
      } else {
        await prisma.integration.create({
          data: {
            type,
            ...config,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }

      // Update in-memory cache
      if (config.webhookUrl) {
        this.webhookEndpoints.set(type, config.webhookUrl);
      }
      if (config.apiKey) {
        this.apiKeys.set(type, config.apiKey);
      }

      this.emit('integration.updated', { type, config });
    } catch (error) {
      console.error('Integration update error:', error);
      throw new Error('Failed to update integration');
    }
  }
}

export const integrationService = IntegrationService.getInstance();
