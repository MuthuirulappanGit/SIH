import { config } from "dotenv";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { db, id, now, seedDefaults } from "./db.js";

const serverDirectory = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(serverDirectory, ".env") });
config({ path: resolve(serverDirectory, "../backend/.env") });

seedDefaults();

const app = express();

const port = Number(process.env.PORT ?? 4000);

const jwtSecret =
  process.env.JWT_SECRET ?? "development-only-change-this";

const adminUsername =
  process.env.ADMIN_USERNAME ?? "Admin123";

const adminPassword =
  process.env.ADMIN_PASSWORD ?? "change-this-before-deploying";

const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

/* ---------------------------------------------------------
   MIDDLEWARE
--------------------------------------------------------- */

app.use(helmet());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? true,
    credentials: true,
  })
);

app.use(cookieParser());

app.use(
  express.json({
    limit: "32kb",
  })
);

app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

/* ---------------------------------------------------------
   VALIDATION SCHEMAS
--------------------------------------------------------- */

const credentials = z.object({
  username: z.string().min(1).max(80),
  password: z.string().min(1).max(200),
});

const idParam = z.object({
  id: z.string().min(1).max(100),
});

const roomInput = z.object({
  roomCode: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(120),
  building: z.string().trim().max(120).default(""),
  floor: z.string().trim().max(40).default(""),
  description: z.string().trim().max(500).default(""),
});

const sensorInput = z.object({
  sensorId: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(120),
  type: z.enum(["electricity", "pir"]),
  model: z.string().trim().max(120).default(""),
  gpioPin: z.string().trim().max(40).default(""),
  interface: z.string().trim().max(80).default(""),
  unit: z.string().trim().max(40).default(""),
  description: z.string().trim().max(500).default(""),
});

const deviceInput = z.object({
  deviceId: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(120),
  firmwareVersion: z.string().trim().max(80).default(""),
});

const settingsInput = z.object({
  currentThreshold: z.number().finite().min(0).max(1000),
  alertDurationMinutes: z.number().int().min(1).max(1440),
  sensorFreshnessSeconds: z.number().int().min(5).max(86400),
});

type DeviceRow = {
  id: string;
  deviceId: string;
  name: string;
  roomId: string | null;
  firmwareVersion: string;
  lastSeenAt: string | null;
  status: string;
  createdAt: string;
};

const hardwareInput = z.object({
  deviceId: z.string().trim().min(1).max(100),

  roomId: z.string().trim().min(1).max(100),

  timestamp: z.string().datetime({
    offset: true,
  }),

  electricity: z.object({
    voltage: z.number().finite().min(0).max(100000),
    current: z.number().finite().min(0).max(100000),
    power: z.number().finite().min(0).max(100000000),
    energy: z.number().finite().min(0).max(1000000000),
  }),

  pir: z
    .object({
      motionDetected: z.boolean(),
    })
    .optional(),
});

/* ---------------------------------------------------------
   AUTHENTICATION
--------------------------------------------------------- */

function auth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token =
    req.cookies?.wattwise_session ??
    req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({
      error: "Authentication required.",
    });
  }

  try {
    jwt.verify(token, jwtSecret);
    next();
  } catch {
    return res.status(401).json({
      error: "Session expired.",
    });
  }
}

/* ---------------------------------------------------------
   ERROR HANDLER
--------------------------------------------------------- */

function sendError(
  res: Response,
  error: unknown
) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      error: "Validation failed.",
      details: error.flatten(),
    });
  }

  console.error(error);

  return res.status(500).json({
    error: "An unexpected server error occurred.",
  });
}

/* ---------------------------------------------------------
   COOKIE
--------------------------------------------------------- */

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 8 * 60 * 60 * 1000,
  };
}

/* ---------------------------------------------------------
   SENSOR FRESHNESS
--------------------------------------------------------- */

function freshnessSeconds() {
  const row = db
    .prepare(
      `
      SELECT sensor_freshness_seconds AS seconds
      FROM settings
      WHERE id = 1
      `
    )
    .get() as { seconds: number };

  return row?.seconds ?? 90;
}

/* ---------------------------------------------------------
   GET LATEST ROOM DATA
--------------------------------------------------------- */

function roomLatest(roomId: string) {
  const reading = db
    .prepare(
      `
      SELECT
        r.*,
        d.device_id AS device_code,
        d.last_seen_at
      FROM readings r
      JOIN devices d ON d.id = r.device_id
      WHERE r.room_id = ?
      ORDER BY r.timestamp DESC
      LIMIT 1
      `
    )
    .get(roomId) as Record<string, unknown> | undefined;

  const device = db
    .prepare(
      `
      SELECT *
      FROM devices
      WHERE room_id = ?
      ORDER BY updated_at DESC
      LIMIT 1
      `
    )
    .get(roomId) as Record<string, unknown> | undefined;

  const isFresh = Boolean(
    device?.last_seen_at &&
      Date.now() -
        Date.parse(String(device.last_seen_at)) <=
        freshnessSeconds() * 1000
  );

  if (!reading || !device || !isFresh) {
    return {
      connected: false,
      voltage: 0,
      current: 0,
      power: 0,
      energy: 0,
      occupancy: "waiting",
      lastUpdate: null,
      deviceStatus: device
        ? "disconnected"
        : "not_configured",
      electricityStatus: "waiting",
      pirStatus: "waiting",
    };
  }

  const occupancy = db
    .prepare(
      `
      SELECT motion_detected
      FROM occupancy_events
      WHERE room_id = ?
      ORDER BY timestamp DESC
      LIMIT 1
      `
    )
    .get(roomId) as
    | { motion_detected: number }
    | undefined;

  return {
    connected: true,
    voltage: reading.voltage,
    current: reading.current,
    power: reading.power,
    energy: reading.energy,

    occupancy: occupancy
      ? occupancy.motion_detected
        ? "occupied"
        : "unoccupied"
      : "waiting",

    lastUpdate: reading.timestamp,

    deviceStatus: "connected",

    electricityStatus: "connected",

    pirStatus: occupancy
      ? "connected"
      : "waiting",
  };
}

/* ---------------------------------------------------------
   WASTAGE DETECTION
--------------------------------------------------------- */

function evaluateWastage(
  roomId: string,
  deviceId: string,
  current: number,
  power: number,
  at: string
) {
  const settings = db
    .prepare(
      `
      SELECT
        current_threshold,
        alert_duration_minutes
      FROM settings
      WHERE id = 1
      `
    )
    .get() as {
    current_threshold: number;
    alert_duration_minutes: number;
  };

  const latestOccupancy = db
    .prepare(
      `
      SELECT motion_detected
      FROM occupancy_events
      WHERE room_id = ?
      ORDER BY timestamp DESC
      LIMIT 1
      `
    )
    .get(roomId) as
    | { motion_detected: number }
    | undefined;

  const unoccupied =
    latestOccupancy?.motion_detected === 0;

  const qualifies =
    unoccupied &&
    current > settings.current_threshold;

  const active = db
    .prepare(
      `
      SELECT *
      FROM wastage_states
      WHERE room_id = ?
      `
    )
    .get(roomId) as
    | { started_at: string }
    | undefined;

  if (!qualifies) {
    if (active) {
      db.prepare(
        `
        DELETE FROM wastage_states
        WHERE room_id = ?
        `
      ).run(roomId);
    }

    db.prepare(
      `
      UPDATE wastage_events
      SET
        status = 'resolved',
        resolved_at = ?
      WHERE room_id = ?
        AND status = 'active'
      `
    ).run(at, roomId);

    return;
  }

  if (!active) {
    db.prepare(
      `
      INSERT INTO wastage_states
      (
        room_id,
        device_id,
        started_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
      `
    ).run(
      roomId,
      deviceId,
      at,
      at
    );

    return;
  }

  db.prepare(
    `
    UPDATE wastage_states
    SET
      updated_at = ?,
      device_id = ?
    WHERE room_id = ?
    `
  ).run(
    at,
    deviceId,
    roomId
  );

  const duration =
    (Date.parse(at) -
      Date.parse(active.started_at)) /
    1000;

  const alreadyDetected = db
    .prepare(
      `
      SELECT id
      FROM wastage_events
      WHERE room_id = ?
        AND status = 'active'
      `
    )
    .get(roomId);

  if (
    duration >=
      settings.alert_duration_minutes * 60 &&
    !alreadyDetected
  ) {
    const eventId = id();

    db.prepare(
      `
      INSERT INTO wastage_events
      (
        id,
        room_id,
        device_id,
        current,
        power,
        started_at,
        detected_at,
        duration_seconds,
        status,
        created_at
      )
      VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
      `
    ).run(
      eventId,
      roomId,
      deviceId,
      current,
      power,
      active.started_at,
      at,
      Math.floor(duration),
      now()
    );

    db.prepare(
      `
      INSERT INTO notifications
      (
        id,
        room_id,
        type,
        severity,
        message,
        current,
        power,
        started_at,
        detected_at,
        created_at
      )
      VALUES
      (?, ?, 'wastage', 'warning', ?, ?, ?, ?, ?, ?)
      `
    ).run(
      id(),
      roomId,
      "The room remained unoccupied while electricity consumption continued beyond the configured threshold duration.",
      current,
      power,
      active.started_at,
      at,
      now()
    );
  }
}

/* ---------------------------------------------------------
   HEALTH
--------------------------------------------------------- */

app.get(
  "/api/health",
  (_req, res) =>
    res.json({
      status: "ok",
      database: "connected",
      time: now(),
    })
);

/* ---------------------------------------------------------
   LOGIN
--------------------------------------------------------- */

app.post(
  "/api/auth/login",
  async (req, res) => {
    try {
      const {
        username,
        password,
      } = credentials.parse(req.body);

      const passwordValid =
        await bcrypt.compare(
          password,
          adminPasswordHash
        );

      if (
        username !== adminUsername ||
        !passwordValid
      ) {
        return res.status(401).json({
          error: "Invalid username or password.",
        });
      }

      db.prepare(
        `
        INSERT INTO users
        (
          id,
          username,
          password_hash,
          created_at
        )
        VALUES (?, ?, ?, ?)

        ON CONFLICT(username)
        DO UPDATE SET
          password_hash = excluded.password_hash
        `
      ).run(
        id(),
        username,
        adminPasswordHash,
        now()
      );

      const token = jwt.sign(
        {
          sub: "administrator",
          username,
        },
        jwtSecret,
        {
          expiresIn: "8h",
        }
      );

      res
        .cookie(
          "wattwise_session",
          token,
          cookieOptions()
        )
        .json({
          user: {
            username,
            role: "Administrator",
          },
        });
    } catch (error) {
      sendError(res, error);
    }
  }
);

/* ---------------------------------------------------------
   LOGOUT
--------------------------------------------------------- */

app.post(
  "/api/auth/logout",
  (_req, res) =>
    res
      .clearCookie("wattwise_session")
      .json({ ok: true })
);

/* ---------------------------------------------------------
   CURRENT USER
--------------------------------------------------------- */

app.get(
  "/api/auth/me",
  auth,
  (_req, res) =>
    res.json({
      user: {
        username: adminUsername,
        role: "Administrator",
      },
    })
);

/* ---------------------------------------------------------
   ESP32 DATA
--------------------------------------------------------- */

app.post(
  "/api/esp32/data",
  async (req, res) => {
    try {
      const key =
        req.header("X-Device-Key");

      if (!key) {
        return res.status(401).json({
          error:
            "Device authentication required.",
        });
      }

      const payload =
        hardwareInput.parse(req.body);

      const device = db
        .prepare(
          `
          SELECT *
          FROM devices
          WHERE device_id = ?
          `
        )
        .get(payload.deviceId) as
        | Record<string, unknown>
        | undefined;

      if (
        !device ||
        !(await bcrypt.compare(
          key,
          String(device.api_key_hash)
        ))
      ) {
        return res.status(401).json({
          error:
            "Invalid device credentials.",
        });
      }

      if (
        device.room_id !==
        payload.roomId
      ) {
        return res.status(400).json({
          error:
            "Device is not assigned to this room.",
        });
      }

      const room = db
        .prepare(
          `
          SELECT id
          FROM rooms
          WHERE id = ?
          `
        )
        .get(payload.roomId);

      if (!room) {
        return res.status(404).json({
          error: "Room not found.",
        });
      }

      const transaction = db.transaction(
        () => {
          const timestamp =
            payload.timestamp;

          db.prepare(
            `
            INSERT INTO readings
            (
              id,
              device_id,
              room_id,
              timestamp,
              voltage,
              current,
              power,
              energy,
              created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `
          ).run(
            id(),
            device.id,
            payload.roomId,
            timestamp,
            payload.electricity.voltage,
            payload.electricity.current,
            payload.electricity.power,
            payload.electricity.energy,
            now()
          );

          db.prepare(
            `
            UPDATE devices
            SET
              last_seen_at = ?,
              status = 'connected',
              updated_at = ?
            WHERE id = ?
            `
          ).run(
            timestamp,
            now(),
            device.id
          );

          if (payload.pir) {
            db.prepare(
              `
              INSERT INTO occupancy_events
              (
                id,
                device_id,
                room_id,
                motion_detected,
                timestamp,
                created_at
              )
              VALUES (?, ?, ?, ?, ?, ?)
              `
            ).run(
              id(),
              device.id,
              payload.roomId,
              payload.pir.motionDetected
                ? 1
                : 0,
              timestamp,
              now()
            );

            if (
              payload.pir.motionDetected
            ) {
              db.prepare(
                `
                DELETE FROM wastage_states
                WHERE room_id = ?
                `
              ).run(payload.roomId);

              db.prepare(
                `
                UPDATE wastage_events
                SET
                  status = 'resolved',
                  resolved_at = ?
                WHERE room_id = ?
                  AND status = 'active'
                `
              ).run(
                timestamp,
                payload.roomId
              );
            }
          }

          evaluateWastage(
            payload.roomId,
            String(device.id),
            payload.electricity.current,
            payload.electricity.power,
            timestamp
          );
        }
      );

      transaction();

      return res.status(201).json({
        accepted: true,
        receivedAt: now(),
      });
    } catch (error) {
      return sendError(res, error);
    }
  }
);

/* ---------------------------------------------------------
   PROTECTED API
--------------------------------------------------------- */

app.use("/api", auth);

/* ---------------------------------------------------------
   DASHBOARD
--------------------------------------------------------- */

app.get(
  "/api/dashboard",
  (_req, res) => {
    const rooms = db
      .prepare(
        `
        SELECT *
        FROM rooms
        ORDER BY room_code
        `
      )
      .all() as Record<
      string,
      unknown
    >[];

    const unread = db
      .prepare(
        `
        SELECT COUNT(*) AS count
        FROM notifications
        WHERE acknowledged = 0
        `
      )
      .get() as { count: number };

    res.json({
      rooms: rooms.map(
        (room) => ({
          ...room,
          latest: roomLatest(
            String(room.id)
          ),
        })
      ),

      unread: unread.count,

      settings: db
        .prepare(
          `
          SELECT
            current_threshold AS currentThreshold,
            alert_duration_minutes AS alertDurationMinutes,
            sensor_freshness_seconds AS sensorFreshnessSeconds
          FROM settings
          WHERE id = 1
          `
        )
        .get(),
    });
  }
);

/* ---------------------------------------------------------
   ROOMS
--------------------------------------------------------- */

app.get(
  "/api/rooms",
  (_req, res) =>
    res.json(
      db
        .prepare(
          `
          SELECT *
          FROM rooms
          ORDER BY room_code
          `
        )
        .all()
    )
);

app.post(
  "/api/rooms",
  (req, res) => {
    try {
      const input =
        roomInput.parse(req.body);

      const timestamp = now();
      const roomId = id();

      db.prepare(
        `
        INSERT INTO rooms
        (
          id,
          room_code,
          name,
          building,
          floor,
          description,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
      ).run(
        roomId,
        input.roomCode,
        input.name,
        input.building,
        input.floor,
        input.description,
        timestamp,
        timestamp
      );

      res.status(201).json(
        db
          .prepare(
            `
            SELECT *
            FROM rooms
            WHERE id = ?
            `
          )
          .get(roomId)
      );
    } catch (error) {
      sendError(res, error);
    }
  }
);

app.put(
  "/api/rooms/:id",
  (req, res) => {
    try {
      const {
        id: roomId,
      } = idParam.parse(req.params);

      const input =
        roomInput.parse(req.body);

      db.prepare(
        `
        UPDATE rooms
        SET
          room_code = ?,
          name = ?,
          building = ?,
          floor = ?,
          description = ?,
          updated_at = ?
        WHERE id = ?
        `
      ).run(
        input.roomCode,
        input.name,
        input.building,
        input.floor,
        input.description,
        now(),
        roomId
      );

      res.json(
        db
          .prepare(
            `
            SELECT *
            FROM rooms
            WHERE id = ?
            `
          )
          .get(roomId)
      );
    } catch (error) {
      sendError(res, error);
    }
  }
);

app.delete(
  "/api/rooms/:id",
  (req, res) => {
    try {
      const {
        id: roomId,
      } = idParam.parse(req.params);

      db.prepare(
        `
        DELETE FROM rooms
        WHERE id = ?
        `
      ).run(roomId);

      res.status(204).end();
    } catch (error) {
      sendError(res, error);
    }
  }
);

app.get(
  "/api/rooms/:id/latest",
  (req, res) => {
    try {
      const {
        id: roomId,
      } = idParam.parse(req.params);

      res.json(
        roomLatest(roomId)
      );
    } catch (error) {
      sendError(res, error);
    }
  }
);

app.get(
  "/api/rooms/:id/readings",
  (req, res) => {
    try {
      const {
        id: roomId,
      } = idParam.parse(req.params);

      const days = Math.min(
        Number(req.query.days ?? 7),
        90
      );

      res.json(
        db
          .prepare(
            `
            SELECT
              r.*,
              d.device_id AS device
            FROM readings r
            JOIN devices d
              ON d.id = r.device_id
            WHERE r.room_id = ?
              AND r.timestamp >= datetime('now', ?)
            ORDER BY r.timestamp DESC
            `
          )
          .all(
            roomId,
            `-${days} days`
          )
      );
    } catch (error) {
      sendError(res, error);
    }
  }
);

/* ---------------------------------------------------------
   SENSORS
--------------------------------------------------------- */

app.get(
  "/api/sensors",
  (_req, res) =>
    res.json(
      db
        .prepare(
          `
          SELECT
            s.*,
            r.name AS room_name,
            d.device_id AS device_code
          FROM sensors s
          LEFT JOIN rooms r
            ON r.id = s.room_id
          LEFT JOIN devices d
            ON d.id = s.device_id
          ORDER BY s.created_at DESC
          `
        )
        .all()
    )
);

app.post(
  "/api/sensors",
  (req, res) => {
    try {
      const input =
        sensorInput.parse(req.body);

      const timestamp = now();
      const sensorId = id();

      db.prepare(
        `
        INSERT INTO sensors
        (
          id,
          sensor_id,
          name,
          type,
          model,
          gpio_pin,
          interface,
          unit,
          configuration,
          status,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'not_connected', ?, ?)
        `
      ).run(
        sensorId,
        input.sensorId,
        input.name,
        input.type,
        input.model,
        input.gpioPin,
        input.interface,
        input.unit,
        JSON.stringify({
          description:
            input.description,
        }),
        timestamp,
        timestamp
      );

      res.status(201).json(
        db
          .prepare(
            `
            SELECT *
            FROM sensors
            WHERE id = ?
            `
          )
          .get(sensorId)
      );
    } catch (error) {
      sendError(res, error);
    }
  }
);

app.put(
  "/api/sensors/:id",
  (req, res) => {
    try {
      const {
        id: sensorId,
      } = idParam.parse(req.params);

      const input =
        sensorInput.parse(req.body);

      db.prepare(
        `
        UPDATE sensors
        SET
          sensor_id = ?,
          name = ?,
          type = ?,
          model = ?,
          gpio_pin = ?,
          interface = ?,
          unit = ?,
          configuration = ?,
          updated_at = ?
        WHERE id = ?
        `
      ).run(
        input.sensorId,
        input.name,
        input.type,
        input.model,
        input.gpioPin,
        input.interface,
        input.unit,
        JSON.stringify({
          description:
            input.description,
        }),
        now(),
        sensorId
      );

      res.json(
        db
          .prepare(
            `
            SELECT *
            FROM sensors
            WHERE id = ?
            `
          )
          .get(sensorId)
      );
    } catch (error) {
      sendError(res, error);
    }
  }
);

app.delete(
  "/api/sensors/:id",
  (req, res) => {
    try {
      const {
        id: sensorId,
      } = idParam.parse(req.params);

      db.prepare(
        `
        DELETE FROM sensors
        WHERE id = ?
        `
      ).run(sensorId);

      res.status(204).end();
    } catch (error) {
      sendError(res, error);
    }
  }
);

app.post(
  "/api/sensors/:id/connect",
  (req, res) => {
    try {
      const {
        id: sensorId,
      } = idParam.parse(req.params);

      const room = z
        .object({
          roomId: z.string().min(1),
        })
        .parse(req.body);

      const sensor = db
        .prepare(
          `
          SELECT *
          FROM sensors
          WHERE id = ?
          `
        )
        .get(sensorId) as
        | {
            type: string;
            device_id: string | null;
          }
        | undefined;

      if (!sensor) {
        return res.status(404).json({
          error: "Sensor not found.",
        });
      }

      const roomExists = db
        .prepare(
          `
          SELECT id
          FROM rooms
          WHERE id = ?
          `
        )
        .get(room.roomId);

      if (!roomExists) {
        return res.status(404).json({
          error: "Room not found.",
        });
      }

      db.prepare(
        `
        UPDATE sensors
        SET
          room_id = ?,
          status = 'connected_waiting',
          updated_at = ?
        WHERE id = ?
        `
      ).run(
        room.roomId,
        now(),
        sensorId
      );

      res.json({
        ok: true,
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

app.post(
  "/api/sensors/:id/disconnect",
  (req, res) => {
    try {
      const {
        id: sensorId,
      } = idParam.parse(req.params);

      db.prepare(
        `
        UPDATE sensors
        SET
          room_id = NULL,
          status = 'not_connected',
          updated_at = ?
        WHERE id = ?
        `
      ).run(
        now(),
        sensorId
      );

      res.json({
        ok: true,
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

/* ---------------------------------------------------------
   DEVICES
--------------------------------------------------------- */

app.get(
  "/api/devices",
  (_req, res) => {
    const cutoff =
      freshnessSeconds() * 1000;

    const devices = db
      .prepare(
        `
        SELECT
          id,
          device_id AS deviceId,
          name,
          room_id AS roomId,
          firmware_version AS firmwareVersion,
          last_seen_at AS lastSeenAt,
          status,
          created_at AS createdAt
        FROM devices
        ORDER BY created_at DESC
        `
      )
      .all() as DeviceRow[];

    res.json(
      devices.map(
        (device) => ({
          ...device,

          status:
            device.lastSeenAt &&
            Date.now() -
              Date.parse(
                device.lastSeenAt
              ) <= cutoff
              ? "connected"
              : device.lastSeenAt
              ? "disconnected"
              : device.status,
        })
      )
    );
  }
);

app.post(
  "/api/devices",
  async (req, res) => {
    try {
      const input =
        deviceInput.parse(req.body);

      const plainKey =
        crypto
          .randomBytes(32)
          .toString("hex");

      const timestamp = now();
      const deviceId = id();

      const apiKeyHash =
        await bcrypt.hash(plainKey, 12);

      db.prepare(
        `
        INSERT INTO devices
        (
          id,
          device_id,
          name,
          api_key_hash,
          firmware_version,
          status,
          created_at,
          updated_at
        )
        VALUES
        (?, ?, ?, ?, ?, 'not_configured', ?, ?)
        `
      ).run(
        deviceId,
        input.deviceId,
        input.name,
        apiKeyHash,
        input.firmwareVersion,
        timestamp,
        timestamp
      );

      res.status(201).json({
        device: db
          .prepare(
            `
            SELECT
              id,
              device_id AS deviceId,
              name,
              firmware_version AS firmwareVersion,
              status,
              created_at AS createdAt
            FROM devices
            WHERE id = ?
            `
          )
          .get(deviceId),

        apiKey: plainKey,
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

app.post(
  "/api/devices/:id/assign",
  (req, res) => {
    try {
      const {
        id: deviceId,
      } = idParam.parse(req.params);

      const room = z
        .object({
          roomId: z.string().min(1),
        })
        .parse(req.body);

      const roomExists = db
        .prepare(
          `
          SELECT id
          FROM rooms
          WHERE id = ?
          `
        )
        .get(room.roomId);

      if (!roomExists) {
        return res.status(404).json({
          error: "Room not found.",
        });
      }

      db.prepare(
        `
        UPDATE devices
        SET
          room_id = ?,
          status = 'not_configured',
          updated_at = ?
        WHERE id = ?
        `
      ).run(
        room.roomId,
        now(),
        deviceId
      );

      res.json({
        ok: true,
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

app.post(
  "/api/devices/:id/disconnect",
  (req, res) => {
    try {
      const {
        id: deviceId,
      } = idParam.parse(req.params);

      db.prepare(
        `
        UPDATE devices
        SET
          room_id = NULL,
          last_seen_at = NULL,
          status = 'not_configured',
          updated_at = ?
        WHERE id = ?
        `
      ).run(
        now(),
        deviceId
      );

      db.prepare(
        `
        UPDATE sensors
        SET
          room_id = NULL,
          device_id = NULL,
          status = 'not_connected'
        WHERE device_id = ?
        `
      ).run(deviceId);

      res.json({
        ok: true,
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

/* ---------------------------------------------------------
   READINGS
--------------------------------------------------------- */

app.get(
  "/api/readings",
  (req, res) => {
    const days = Math.min(
      Number(req.query.days ?? 7),
      90
    );

    res.json(
      db
        .prepare(
          `
          SELECT
            r.*,
            d.device_id AS device,
            rm.name AS room
          FROM readings r
          JOIN devices d
            ON d.id = r.device_id
          JOIN rooms rm
            ON rm.id = r.room_id
          WHERE r.timestamp >= datetime('now', ?)
          ORDER BY r.timestamp DESC
          `
        )
        .all(`-${days} days`)
    );
  }
);

/* ---------------------------------------------------------
   ALERTS
--------------------------------------------------------- */

app.get(
  "/api/alerts",
  (_req, res) =>
    res.json(
      db
        .prepare(
          `
          SELECT
            n.*,
            r.name AS room
          FROM notifications n
          JOIN rooms r
            ON r.id = n.room_id
          ORDER BY n.detected_at DESC
          `
        )
        .all()
    )
);

app.post(
  "/api/alerts/:id/acknowledge",
  (req, res) => {
    try {
      const {
        id: alertId,
      } = idParam.parse(req.params);

      db.prepare(
        `
        UPDATE notifications
        SET
          acknowledged = 1,
          acknowledged_at = ?
        WHERE id = ?
        `
      ).run(
        now(),
        alertId
      );

      res.json({
        ok: true,
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

/* ---------------------------------------------------------
   WASTAGE
--------------------------------------------------------- */

app.get(
  "/api/wastage",
  (_req, res) =>
    res.json(
      db
        .prepare(
          `
          SELECT
            w.*,
            r.name AS room,
            d.device_id AS device
          FROM wastage_events w
          JOIN rooms r
            ON r.id = w.room_id
          JOIN devices d
            ON d.id = w.device_id
          ORDER BY detected_at DESC
          `
        )
        .all()
    )
);

/* ---------------------------------------------------------
   ANALYTICS
--------------------------------------------------------- */

app.get(
  "/api/analytics",
  (_req, res) => {
    const totals = db
      .prepare(
        `
        SELECT
          COUNT(*) AS count,
          COALESCE(SUM(energy), 0) AS energy,
          COALESCE(AVG(power), 0) AS averagePower,
          COALESCE(MAX(power), 0) AS peakPower,
          COALESCE(AVG(current), 0) AS averageCurrent
        FROM readings
        `
      )
      .get();

    const series = db
      .prepare(
        `
        SELECT
          substr(timestamp, 1, 16) AS time,
          power,
          energy
        FROM readings
        ORDER BY timestamp ASC
        LIMIT 500
        `
      )
      .all();

    const occupancy = db
      .prepare(
        `
        SELECT
          timestamp,
          motion_detected AS motionDetected
        FROM occupancy_events
        ORDER BY timestamp ASC
        LIMIT 500
        `
      )
      .all();

    const wastage = db
      .prepare(
        `
        SELECT
          COUNT(*) AS events,
          COALESCE(
            SUM(duration_seconds),
            0
          ) AS duration
        FROM wastage_events
        `
      )
      .get();

    res.json({
      totals,
      series,
      occupancy,
      wastage,
    });
  }
);

/* ---------------------------------------------------------
   AI INSIGHTS
--------------------------------------------------------- */

app.get(
  "/api/ai/insights",
  (_req, res) => {
    const readingStats = db
      .prepare(
        `
        SELECT
          COUNT(*) AS count,
          COALESCE(SUM(energy), 0) AS totalEnergy,
          COALESCE(AVG(power), 0) AS avgPower,
          COALESCE(MAX(power), 0) AS peakPower,
          COALESCE(MIN(power), 0) AS minPower,
          MIN(timestamp) AS firstReading,
          MAX(timestamp) AS lastReading
        FROM readings
        `
      )
      .get() as {
      count: number;
      totalEnergy: number;
      avgPower: number;
      peakPower: number;
      minPower: number;
      firstReading: string | null;
      lastReading: string | null;
    };

    if (!readingStats || readingStats.count === 0) {
      return res.json({
        hasData: false,
        message:
          "Real sensor data is required to generate AI insights. Hardware is currently offline or waiting for data transmission.",
        summary:
          "No real telemetry has been recorded yet. Connect an ESP32 hardware device with electricity and PIR occupancy sensors to begin intelligent energy analysis.",
        insights: [],
        recommendations: [
          {
            title: "Register ESP32 Hardware",
            detail:
              "Navigate to Connect Hardware to provision an ESP32 device ID and receive an authentication key.",
            impact: "System Readiness",
          },
          {
            title: "Attach Sensors to Rooms",
            detail:
              "Assign electricity and PIR occupancy sensors to monitored spaces such as classrooms or laboratories.",
            impact: "Data Collection",
          },
        ],
        metrics: {
          efficiencyScore: 100,
          wastedEnergyKwh: 0,
          totalMonitoredKwh: 0,
          activeAnomalies: 0,
        },
      });
    }

    const roomBreakdown = db
      .prepare(
        `
        SELECT
          r.name AS roomName,
          r.room_code AS roomCode,
          COUNT(rd.id) AS readingsCount,
          COALESCE(AVG(rd.power), 0) AS avgPower,
          COALESCE(MAX(rd.power), 0) AS peakPower,
          COALESCE(SUM(rd.energy), 0) AS totalEnergy
        FROM rooms r
        LEFT JOIN readings rd ON rd.room_id = r.id
        GROUP BY r.id
        ORDER BY avgPower DESC
        `
      )
      .all() as {
      roomName: string;
      roomCode: string;
      readingsCount: number;
      avgPower: number;
      peakPower: number;
      totalEnergy: number;
    }[];

    const wastageSummary = db
      .prepare(
        `
        SELECT
          COUNT(*) AS totalEvents,
          COALESCE(SUM(duration_seconds), 0) AS totalDurationSeconds,
          COALESCE(AVG(power), 0) AS avgWastagePower
        FROM wastage_events
        `
      )
      .get() as {
      totalEvents: number;
      totalDurationSeconds: number;
      avgWastagePower: number;
    };

    const wastedHours = wastageSummary.totalDurationSeconds / 3600;
    const estimatedWastedKwh =
      (wastageSummary.avgWastagePower * wastedHours) / 1000;

    const insights: {
      type: "trend" | "anomaly" | "optimization" | "benchmark";
      title: string;
      description: string;
      severity: "low" | "medium" | "high";
    }[] = [];

    const topRoom = roomBreakdown[0];
    if (topRoom && topRoom.avgPower > 0) {
      insights.push({
        type: "trend",
        title: `Primary Load Concentration: ${topRoom.roomName}`,
        description: `${topRoom.roomName} (${topRoom.roomCode}) registers the highest mean electricity demand at ${topRoom.avgPower.toFixed(1)} W across recorded samples.`,
        severity: "low",
      });
    }

    if (wastageSummary.totalEvents > 0) {
      insights.push({
        type: "anomaly",
        title: `Detected Wastage Incidents: ${wastageSummary.totalEvents} Event(s)`,
        description: `WattWise verified ${wastageSummary.totalEvents} period(s) where rooms remained unoccupied while electricity continued flowing past the 20-minute threshold, totaling ${(wastageSummary.totalDurationSeconds / 60).toFixed(0)} minutes.`,
        severity: "high",
      });
    } else {
      insights.push({
        type: "benchmark",
        title: "Zero Unoccupied Wastage Detected",
        description:
          "All recorded electricity consumption aligned with verified occupancy periods or remained below the idle threshold.",
        severity: "low",
      });
    }

    if (readingStats.peakPower > readingStats.avgPower * 2 && readingStats.peakPower > 50) {
      insights.push({
        type: "optimization",
        title: "Peak Demand Spikes",
        description: `Peak load reached ${readingStats.peakPower.toFixed(1)} W, which is more than double the average baseline of ${readingStats.avgPower.toFixed(1)} W.`,
        severity: "medium",
      });
    }

    const recommendations = [
      {
        title: "Automated Off-Hour Cutoff",
        detail:
          "For rooms with recurring unoccupied load, consider smart relay integration to isolate circuits automatically after sustained inactivity.",
        impact: "High Energy Savings",
      },
      {
        title: "Idle Baseline Optimization",
        detail:
          `Baseline idle load is currently measured at ${readingStats.minPower.toFixed(1)} W. Audit peripheral hardware in standby mode to reduce baseline parasitic draw.`,
        impact: "Continuous Reduction",
      },
    ];

    const efficiencyScore = Math.max(
      40,
      Math.min(100, Math.round(100 - (wastageSummary.totalEvents * 10)))
    );

    res.json({
      hasData: true,
      message: "AI analysis completed using verified telemetry records.",
      summary: `Analyzed ${readingStats.count} real sensor readings from ${readingStats.firstReading ? new Date(readingStats.firstReading).toLocaleDateString() : "active sessions"}. Overall power average is ${readingStats.avgPower.toFixed(1)} W with peak of ${readingStats.peakPower.toFixed(1)} W.`,
      insights,
      recommendations,
      metrics: {
        efficiencyScore,
        wastedEnergyKwh: Number(estimatedWastedKwh.toFixed(3)),
        totalMonitoredKwh: Number(readingStats.totalEnergy.toFixed(3)),
        activeAnomalies: wastageSummary.totalEvents,
      },
    });
  }
);

/* ---------------------------------------------------------
   SETTINGS
--------------------------------------------------------- */

app.get(
  "/api/settings",
  (_req, res) =>
    res.json(
      db
        .prepare(
          `
          SELECT
            current_threshold AS currentThreshold,
            alert_duration_minutes AS alertDurationMinutes,
            sensor_freshness_seconds AS sensorFreshnessSeconds
          FROM settings
          WHERE id = 1
          `
        )
        .get()
    )
);

app.put(
  "/api/settings",
  (req, res) => {
    try {
      const input =
        settingsInput.parse(req.body);

      db.prepare(
        `
        UPDATE settings
        SET
          current_threshold = ?,
          alert_duration_minutes = ?,
          sensor_freshness_seconds = ?,
          updated_at = ?
        WHERE id = 1
        `
      ).run(
        input.currentThreshold,
        input.alertDurationMinutes,
        input.sensorFreshnessSeconds,
        now()
      );

      res.json(input);
    } catch (error) {
      sendError(res, error);
    }
  }
);

/* ---------------------------------------------------------
   FRONTEND
--------------------------------------------------------- */

app.use(
  express.static("dist")
);

app.get(
  "*",
  (_req, res) =>
    res.sendFile(
      "index.html",
      {
        root: "dist",
      }
    )
);

/* ---------------------------------------------------------
   FINAL ERROR HANDLER
--------------------------------------------------------- */

app.use(
  (
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) =>
    sendError(
      res,
      error
    )
);

/* ---------------------------------------------------------
   START SERVER
--------------------------------------------------------- */

app.listen(
  port,
  "0.0.0.0",
  () =>
    console.log(
      `WattWise API listening on ${port}`
    )
);