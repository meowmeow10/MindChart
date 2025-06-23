const { pgTable, varchar, text, timestamp, jsonb, index, serial, boolean } = require('drizzle-orm/pg-core');

// Session storage table for authentication
const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for authentication
const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Mind maps table for storing collaborative mind maps
const mindMaps = pgTable("mind_maps", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull().default("Untitled Mind Map"),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  data: jsonb("data").notNull(), // Store the complete mind map data
  isPublic: boolean("is_public").default(false),
  shareCode: varchar("share_code", { length: 12 }).unique(), // For sharing via code
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Collaborators table for tracking who has access to which mind maps
const collaborators = pgTable("collaborators", {
  id: serial("id").primaryKey(),
  mindMapId: serial("mind_map_id").notNull().references(() => mindMaps.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  permission: varchar("permission", { length: 20 }).notNull().default("edit"), // 'view' or 'edit'
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Mind map activities for real-time collaboration tracking
const mindMapActivities = pgTable("mind_map_activities", {
  id: serial("id").primaryKey(),
  mindMapId: serial("mind_map_id").notNull().references(() => mindMaps.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  action: varchar("action", { length: 50 }).notNull(), // 'node_add', 'node_edit', 'node_delete', 'connection_add', etc.
  data: jsonb("data"), // Store the specific change data
  timestamp: timestamp("timestamp").defaultNow(),
});

module.exports = {
  sessions,
  users,
  mindMaps,
  collaborators,
  mindMapActivities
};