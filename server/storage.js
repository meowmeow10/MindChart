const { users, mindMaps, collaborators, mindMapActivities } = require("../shared/schema");
const { db } = require("./db");
const { eq, and, or } = require("drizzle-orm");

// Interface for storage operations
class DatabaseStorage {
  // User operations (required for Replit Auth)
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData) {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Mind map operations
  async createMindMap(ownerId, title, data, isPublic = false) {
    const shareCode = this.generateShareCode();
    const [mindMap] = await db
      .insert(mindMaps)
      .values({
        title,
        ownerId,
        data,
        isPublic,
        shareCode,
      })
      .returning();
    return mindMap;
  }

  async getMindMap(id) {
    const [mindMap] = await db.select().from(mindMaps).where(eq(mindMaps.id, id));
    return mindMap;
  }

  async getMindMapByShareCode(shareCode) {
    const [mindMap] = await db.select().from(mindMaps).where(eq(mindMaps.shareCode, shareCode));
    return mindMap;
  }

  async updateMindMap(id, data) {
    const [mindMap] = await db
      .update(mindMaps)
      .set({ data, updatedAt: new Date() })
      .where(eq(mindMaps.id, id))
      .returning();
    return mindMap;
  }

  async getUserMindMaps(userId) {
    // Get mind maps owned by user or where user is a collaborator
    const ownedMaps = await db
      .select()
      .from(mindMaps)
      .where(eq(mindMaps.ownerId, userId));

    const collaboratedMaps = await db
      .select({
        id: mindMaps.id,
        title: mindMaps.title,
        ownerId: mindMaps.ownerId,
        data: mindMaps.data,
        isPublic: mindMaps.isPublic,
        shareCode: mindMaps.shareCode,
        createdAt: mindMaps.createdAt,
        updatedAt: mindMaps.updatedAt,
        permission: collaborators.permission
      })
      .from(mindMaps)
      .innerJoin(collaborators, eq(collaborators.mindMapId, mindMaps.id))
      .where(eq(collaborators.userId, userId));

    return [...ownedMaps, ...collaboratedMaps];
  }

  // Collaborator operations
  async addCollaborator(mindMapId, userId, permission = 'edit') {
    const [collaborator] = await db
      .insert(collaborators)
      .values({ mindMapId, userId, permission })
      .returning();
    return collaborator;
  }

  async getCollaborators(mindMapId) {
    return await db
      .select({
        id: collaborators.id,
        userId: collaborators.userId,
        permission: collaborators.permission,
        joinedAt: collaborators.joinedAt,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        profileImageUrl: users.profileImageUrl
      })
      .from(collaborators)
      .innerJoin(users, eq(users.id, collaborators.userId))
      .where(eq(collaborators.mindMapId, mindMapId));
  }

  async hasAccess(mindMapId, userId) {
    // Check if user owns the mind map
    const [mindMap] = await db.select().from(mindMaps).where(
      and(eq(mindMaps.id, mindMapId), eq(mindMaps.ownerId, userId))
    );
    if (mindMap) return { access: true, permission: 'owner' };

    // Check if user is a collaborator
    const [collaborator] = await db.select().from(collaborators).where(
      and(eq(collaborators.mindMapId, mindMapId), eq(collaborators.userId, userId))
    );
    if (collaborator) return { access: true, permission: collaborator.permission };

    // Check if mind map is public
    const [publicMap] = await db.select().from(mindMaps).where(
      and(eq(mindMaps.id, mindMapId), eq(mindMaps.isPublic, true))
    );
    if (publicMap) return { access: true, permission: 'view' };

    return { access: false, permission: null };
  }

  // Activity tracking
  async logActivity(mindMapId, userId, action, data) {
    const [activity] = await db
      .insert(mindMapActivities)
      .values({ mindMapId, userId, action, data })
      .returning();
    return activity;
  }

  // Utility functions
  generateShareCode() {
    return Math.random().toString(36).substring(2, 14).toUpperCase();
  }
}

const storage = new DatabaseStorage();
module.exports = { storage, DatabaseStorage };