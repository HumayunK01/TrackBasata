export const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "TrackBasata API Documentation",
    version: "1.0.0",
    description: "Production-grade REST API Gateway for TrackBasata document productivity tracking. Features parameterized query filtering, centralized category administration, atomic tap counters, and strict JWT role-based access control.",
    contact: {
      name: "TrackBasata Engineering",
    },
  },
  servers: [
    {
      url: "http://localhost:5000",
      description: "Local Development Server",
    },
    {
      url: "/",
      description: "Current Host",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your Supabase Access Token (JWT). Authenticates requests and extracts user ID / role.",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: {
            type: "object",
            properties: {
              message: { type: "string", example: "Invalid or expired authorization token" },
              code: { type: "string", example: "UNAUTHORIZED" },
            },
          },
        },
      },
      Category: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid", example: "b1a2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" },
          key: { type: "string", example: "moved_to_indexing" },
          label: { type: "string", example: "Moved to Indexing" },
          short: { type: "string", example: "Inbox" },
          position: { type: "integer", example: 0 },
          is_active: { type: "boolean", example: true },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
        },
      },
      CreateCategoryInput: {
        type: "object",
        required: ["key", "label", "short"],
        properties: {
          key: { type: "string", example: "moved_to_indexing", description: "Unique snake_case identifier" },
          label: { type: "string", example: "Moved to Indexing", description: "Display name on UI" },
          short: { type: "string", example: "Inbox", description: "Abbreviated badge name" },
          position: { type: "integer", example: 0, description: "Display order index" },
          is_active: { type: "boolean", example: true, description: "Active state visibility" },
        },
      },
      UpdateCategoryInput: {
        type: "object",
        properties: {
          label: { type: "string", example: "Updated Label" },
          short: { type: "string", example: "Upd" },
          position: { type: "integer", example: 1 },
          is_active: { type: "boolean", example: true },
        },
      },
      ReorderCategoriesInput: {
        type: "object",
        required: ["items"],
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              required: ["id", "position"],
              properties: {
                id: { type: "string", format: "uuid" },
                position: { type: "integer" },
              },
            },
            example: [
              { id: "b1a2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d", position: 0 },
              { id: "c2b3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e", position: 1 },
            ],
          },
        },
      },
      DailyLog: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          user_id: { type: "string", format: "uuid" },
          log_date: { type: "string", format: "date", example: "2026-10-09" },
          counts: {
            type: "object",
            additionalProperties: { type: "integer" },
            example: {
              moved_to_indexing: 42,
              worked_on_indexing: 28,
              worked_on_ng: 15,
              fax_back: 6,
            },
          },
          notes: { type: "string", nullable: true, example: "Completed batch A" },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
        },
      },
      UpsertDailyLogInput: {
        type: "object",
        required: ["log_date", "counts"],
        properties: {
          log_date: { type: "string", format: "date", example: "2026-10-09" },
          counts: {
            type: "object",
            additionalProperties: { type: "integer" },
            example: {
              moved_to_indexing: 45,
              worked_on_indexing: 30,
            },
          },
          notes: { type: "string", nullable: true, example: "Daily log notes" },
        },
      },
      TapDailyLogInput: {
        type: "object",
        required: ["log_date", "category_key"],
        properties: {
          log_date: { type: "string", format: "date", example: "2026-10-09" },
          category_key: { type: "string", example: "moved_to_indexing" },
          increment: { type: "integer", default: 1, example: 1 },
        },
      },
      Facility: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string", example: "Memorial Healthcare Center" },
          fax_number: { type: "string", example: "800-555-0199" },
          address: { type: "string", nullable: true, example: "123 Medical Park Dr, Suite 200" },
          sort_order: { type: "integer", example: 1 },
          verified: { type: "boolean", example: true },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
        },
      },
      CreateFacilityInput: {
        type: "object",
        required: ["name", "fax_number"],
        properties: {
          name: { type: "string", example: "Memorial Healthcare Center" },
          fax_number: { type: "string", example: "800-555-0199" },
          address: { type: "string", nullable: true, example: "123 Medical Park Dr, Suite 200" },
          sort_order: { type: "integer", example: 0 },
          verified: { type: "boolean", example: false },
        },
      },
      UpdateFacilityInput: {
        type: "object",
        properties: {
          name: { type: "string", example: "Updated Memorial Clinic" },
          fax_number: { type: "string", example: "800-555-0199" },
          address: { type: "string", nullable: true, example: "456 Health Blvd" },
          sort_order: { type: "integer", example: 2 },
          verified: { type: "boolean", example: true },
        },
      },
      HealthResponse: {
        type: "object",
        properties: {
          status: { type: "string", example: "ok" },
          timestamp: { type: "string", format: "date-time" },
          uptime: { type: "number", example: 120.45 },
          checks: {
            type: "object",
            properties: {
              database: { type: "string", example: "connected" },
              redis: { type: "string", example: "connected" },
            },
          },
        },
      },
    },
  },
  paths: {
    "/api/v1/health": {
      get: {
        tags: ["System"],
        summary: "Service Health Check",
        description: "Returns API availability, system uptime, and operational checks for PostgreSQL and Redis.",
        responses: {
          200: {
            description: "Service is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/HealthResponse" },
                  },
                },
              },
            },
          },
          503: {
            description: "Service degraded or unreachable",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/v1/categories": {
      get: {
        tags: ["Categories"],
        summary: "List Categories or Get by ID",
        description: "Retrieves active centralized categories ordered by position. Optionally supply query `?id=UUID` to retrieve a single category.",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "query",
            required: false,
            schema: { type: "string", format: "uuid" },
            description: "Optional UUID to fetch a single category instead of the list",
            example: "b1a2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
          },
        ],
        responses: {
          200: {
            description: "Category list or single category object",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      oneOf: [
                        { type: "array", items: { $ref: "#/components/schemas/Category" } },
                        { $ref: "#/components/schemas/Category" },
                      ],
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          404: { description: "Category not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
      post: {
        tags: ["Categories"],
        summary: "Create Category (Admin Only)",
        description: "Creates a new centralized category. Caller must possess administrator role (`is_admin()`).",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateCategoryInput" },
            },
          },
        },
        responses: {
          201: {
            description: "Category created successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/Category" },
                  },
                },
              },
            },
          },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          403: { description: "Forbidden - Administrator privileges required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
      patch: {
        tags: ["Categories"],
        summary: "Update Category (Admin Only)",
        description: "Updates category properties (label, short badge, active status, position). Supply target category via query parameter `?id=UUID`.",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "query",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "UUID of the category to update",
            example: "b1a2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateCategoryInput" },
            },
          },
        },
        responses: {
          200: {
            description: "Category updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/Category" },
                  },
                },
              },
            },
          },
          400: { description: "Validation or query missing", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          403: { description: "Forbidden - Administrator privileges required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          404: { description: "Category not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
      delete: {
        tags: ["Categories"],
        summary: "Soft-Archive Category (Admin Only)",
        description: "Soft-archives a category by setting `is_active = false`. Supply target category via query parameter `?id=UUID`.",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "query",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "UUID of the category to archive",
            example: "b1a2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
          },
        ],
        responses: {
          200: {
            description: "Category soft-deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Category archived successfully" },
                  },
                },
              },
            },
          },
          403: { description: "Forbidden - Administrator privileges required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          404: { description: "Category not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/v1/categories/reorder": {
      put: {
        tags: ["Categories"],
        summary: "Batch Reorder Categories (Admin Only)",
        description: "Atomically updates sequence ordering for multiple categories. Caller must be an administrator.",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ReorderCategoriesInput" },
            },
          },
        },
        responses: {
          200: {
            description: "Reordering applied",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { type: "array", items: { $ref: "#/components/schemas/Category" } },
                  },
                },
              },
            },
          },
          403: { description: "Forbidden", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/v1/logs": {
      get: {
        tags: ["Daily Logs"],
        summary: "Fetch Logs (Date or Date-Range Filtered)",
        description: "Fetches user daily logs. Supply `?date=YYYY-MM-DD` for a single date or `?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` for historical aggregation.",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "date",
            in: "query",
            required: false,
            schema: { type: "string", format: "date" },
            description: "Specific date in YYYY-MM-DD format",
            example: "2026-10-09",
          },
          {
            name: "start_date",
            in: "query",
            required: false,
            schema: { type: "string", format: "date" },
            description: "Range start date in YYYY-MM-DD format",
            example: "2026-10-01",
          },
          {
            name: "end_date",
            in: "query",
            required: false,
            schema: { type: "string", format: "date" },
            description: "Range end date in YYYY-MM-DD format",
            example: "2026-10-09",
          },
        ],
        responses: {
          200: {
            description: "Log record or list of logs matching criteria",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      oneOf: [
                        { type: "array", items: { $ref: "#/components/schemas/DailyLog" } },
                        { $ref: "#/components/schemas/DailyLog" },
                        { type: "null" },
                      ],
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
      post: {
        tags: ["Daily Logs"],
        summary: "Upsert Daily Log",
        description: "Creates or updates document counts for a specific date. Automatically records entry in immutable audit log.",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpsertDailyLogInput" },
            },
          },
        },
        responses: {
          200: {
            description: "Log saved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/DailyLog" },
                  },
                },
              },
            },
          },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
      delete: {
        tags: ["Daily Logs"],
        summary: "Delete Daily Log",
        description: "Deletes the daily log record for a given date. Supply query `?date=YYYY-MM-DD`.",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "date",
            in: "query",
            required: true,
            schema: { type: "string", format: "date" },
            description: "Date of the log to delete",
            example: "2026-10-09",
          },
        ],
        responses: {
          200: {
            description: "Log deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Log deleted successfully" },
                  },
                },
              },
            },
          },
          404: { description: "Log not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/v1/logs/tap": {
      post: {
        tags: ["Daily Logs"],
        summary: "Rapid Tap Increment",
        description: "High-frequency atomic counter increment designed for rapid button presses with zero latency locking.",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TapDailyLogInput" },
            },
          },
        },
        responses: {
          200: {
            description: "Counter incremented",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/DailyLog" },
                  },
                },
              },
            },
          },
          400: { description: "Invalid category key or date", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/v1/facilities": {
      get: {
        tags: ["Facilities"],
        summary: "List Facilities or Get by ID",
        description: "Fetches clinic facilities ordered by sort priority. Optionally supply query parameter `?id=UUID` for a single clinic record.",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "query",
            required: false,
            schema: { type: "string", format: "uuid" },
            description: "Optional UUID to fetch a single facility",
            example: "c3d4e5f6-7a8b-9c0d-1e2f-3a4b5c6d7e8f",
          },
        ],
        responses: {
          200: {
            description: "Facility list or single facility record",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      oneOf: [
                        { type: "array", items: { $ref: "#/components/schemas/Facility" } },
                        { $ref: "#/components/schemas/Facility" },
                      ],
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
      post: {
        tags: ["Facilities"],
        summary: "Create Facility (Admin Only)",
        description: "Adds a new clinic facility. Administrator role required.",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateFacilityInput" },
            },
          },
        },
        responses: {
          201: {
            description: "Facility created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/Facility" },
                  },
                },
              },
            },
          },
          403: { description: "Forbidden", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
      patch: {
        tags: ["Facilities"],
        summary: "Update Facility (Admin Only)",
        description: "Updates facility details. Supply target facility via query parameter `?id=UUID`.",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "query",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "UUID of the facility to update",
            example: "c3d4e5f6-7a8b-9c0d-1e2f-3a4b5c6d7e8f",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateFacilityInput" },
            },
          },
        },
        responses: {
          200: {
            description: "Facility updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/Facility" },
                  },
                },
              },
            },
          },
          403: { description: "Forbidden", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          404: { description: "Facility not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
      delete: {
        tags: ["Facilities"],
        summary: "Delete Facility (Admin Only)",
        description: "Deletes a facility. Supply target facility via query parameter `?id=UUID`.",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "query",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "UUID of the facility to remove",
            example: "c3d4e5f6-7a8b-9c0d-1e2f-3a4b5c6d7e8f",
          },
        ],
        responses: {
          200: {
            description: "Facility deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Facility deleted successfully" },
                  },
                },
              },
            },
          },
          403: { description: "Forbidden", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          404: { description: "Facility not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/v1/logo": {
      get: {
        tags: ["Image Proxies"],
        summary: "SSRF-Protected Domain Logo Proxy",
        description: "Safely proxies company brand logos via Clearbit with SSRF blocklists and Redis caching.",
        parameters: [
          {
            name: "domain",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "Target domain name",
            example: "github.com",
          },
        ],
        responses: {
          200: { description: "Image stream (image/png or image/jpeg)" },
          400: { description: "Invalid domain or SSRF blocked", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/v1/favicon": {
      get: {
        tags: ["Image Proxies"],
        summary: "SSRF-Protected Domain Favicon Proxy",
        description: "Safely proxies domain favicons via Google with SSRF blocklists and Redis caching.",
        parameters: [
          {
            name: "domain",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "Target domain name",
            example: "github.com",
          },
        ],
        responses: {
          200: { description: "Favicon stream (image/x-icon or image/png)" },
          400: { description: "Invalid domain or SSRF blocked", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/v1/tracker/export": {
      get: {
        tags: ["Tracker"],
        summary: "Export tracker records to CSV or JSON with active filters",
        description: "Streams or downloads full-fledged tracker datasets filtered by account, status (e.g., waiting), search query, and tracker mode directly from server database.",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "mode",
            in: "query",
            schema: { type: "string", enum: ["fax", "indexable"], default: "fax" },
            description: "Tracker category mode (fax or indexable)",
          },
          {
            name: "account_id",
            in: "query",
            schema: { type: "string", format: "uuid" },
            description: "Filter by specific account UUID",
          },
          {
            name: "status",
            in: "query",
            schema: { type: "string" },
            description: "Comma-separated status groups or status names to export (e.g. 'waiting' or 'waiting,failed')",
          },
          {
            name: "q",
            in: "query",
            schema: { type: "string" },
            description: "Case-insensitive search query matching patient name or notes",
          },
          {
            name: "format",
            in: "query",
            schema: { type: "string", enum: ["csv", "json"], default: "csv" },
            description: "Export file format (csv or json)",
          },
          {
            name: "sort",
            in: "query",
            schema: { type: "string", enum: ["patient_name", "updated_at", "created_at", "overall_status"], default: "updated_at" },
            description: "Sort field",
          },
          {
            name: "sort_dir",
            in: "query",
            schema: { type: "string", enum: ["asc", "desc"], default: "desc" },
            description: "Sort direction",
          },
        ],
        responses: {
          200: {
            description: "Tracker export file (text/csv with UTF-8 BOM or application/json)",
            headers: {
              "Content-Disposition": {
                schema: { type: "string", example: "attachment; filename=\"fax-tracker-export-2026-10-21.csv\"" },
              },
              "X-Export-Count": {
                schema: { type: "integer", example: 42 },
              },
            },
          },
          400: { description: "Invalid filter parameters", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          401: { description: "Unauthorized / missing token", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
  },
};
