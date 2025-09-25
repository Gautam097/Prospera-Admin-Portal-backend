// src/config/swagger.js
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
    definition: {
        openapi: '3.0.4',
        info: {
            title: 'Prospera Swagger Currency Portal',
            version: '1.0.0',
            description: `This is the official API documentation for the Prospera Currency Portal, built using the OpenAPI 3.0 specification.

This documentation provides details about all available endpoints, request/response formats, authentication methods, and more.

Use this to integrate your applications with the Prospera backend services or to understand the structure of available operations.

Useful links:
- [Swagger Official Docs](https://swagger.io/docs/specification/about/)`,
            contact: {
                name: 'Anshul Karyal',
                email: 'anshul@revinfotech.com',
                url: 'https://prospera.global',
            },
        },
        externalDocs: {
            description: 'Learn more about OpenAPI and Swagger',
            url: 'https://swagger.io',
        },
        servers: [
            {
                url: 'http://localhost:5076/api/v1',
                description: 'Local development server',
            },
            {
                url: 'https://api.prospera.global/api/v1',
                description: 'Production server',
            },
        ],
        tags: [
            {
                name: 'auth',
                description: 'Endpoints related to user operations such as registration, login, MFA setup, etc.',
            },
            {
                name: 'users',
                description: 'Endpoints related to users operations.',
            },
        ],
        security: [
            {
                bearerAuth: [],
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string', example: 'Invalid or expired OTP' },
                        error: { type: 'string', example: 'Unauthorized' },
                    },
                },
                SecurityQuestion: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid', example: 'f5a7b080-4a4f-4e88-81be-d4e91493c59e' },
                        question: { type: 'string', example: 'What was the name of your first pet?' },
                        maxAnswerLength: { type: 'integer', example: 100 },
                        createdAt: { type: 'string', format: 'date-time', example: '2025-07-15T12:34:56.000Z' },
                        updatedAt: { type: 'string', format: 'date-time', example: '2025-07-15T12:35:56.000Z' },
                    },
                },
                SecurityQuestionResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: { $ref: '#/components/schemas/SecurityQuestion' },
                        message: { type: 'string', example: 'Security question created successfully' },
                    },
                },
            },
        },
    },
    apis: ['./src/controllers/**/*.js'], // or wherever your routes/controllers are documented
};

const swaggerSpec = swaggerJsdoc(options);

export { swaggerUi, swaggerSpec };
