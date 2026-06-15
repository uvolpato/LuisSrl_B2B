import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { mapSpError } from '../common/sp-error';
import type { UserRow } from '../common/user-row';

export interface PermissionGroupRow {
  id: number;
  name: string;
  slug: string;
  permissions: string[];
  created_at: Date;
  updated_at: Date;
}

export interface AdminPermissionRow {
  id: number;
  user_id: number;
  permission: string;
  granted: boolean;
}

@Injectable()
export class AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  async spCreateGroup(params: {
    actorId: number;
    name: string;
    slug: string;
    permissions: string[];
    ip?: string;
  }): Promise<PermissionGroupRow> {
    try {
      const [row] = await this.prisma.$queryRaw<PermissionGroupRow[]>`
        SELECT * FROM admin.fn_permission_group_create(
          ${params.actorId}::int, ${params.name}, ${params.slug},
          ${params.permissions}::text[], ${params.ip ?? null}
        )`;
      return row;
    } catch (e) {
      mapSpError(e);
    }
  }

  async spUpdateGroup(params: {
    actorId: number;
    groupId: number;
    name?: string;
    slug?: string;
    permissions?: string[];
    ip?: string;
  }): Promise<PermissionGroupRow> {
    try {
      const [row] = await this.prisma.$queryRaw<PermissionGroupRow[]>`
        SELECT * FROM admin.fn_permission_group_update(
          ${params.actorId}::int, ${params.groupId}::int,
          ${params.name ?? null}, ${params.slug ?? null},
          ${params.permissions ?? null}::text[], ${params.ip ?? null}
        )`;
      return row;
    } catch (e) {
      mapSpError(e);
    }
  }

  async spDeleteGroup(params: {
    actorId: number;
    groupId: number;
    ip?: string;
  }): Promise<void> {
    try {
      await this.prisma.$queryRaw`
        SELECT admin.fn_permission_group_delete(
          ${params.actorId}::int, ${params.groupId}::int, ${params.ip ?? null}
        )`;
    } catch (e) {
      mapSpError(e);
    }
  }

  async spUpsertPermission(params: {
    actorId: number;
    userId: number;
    permission: string;
    granted: boolean;
    ip?: string;
  }): Promise<AdminPermissionRow> {
    try {
      const [row] = await this.prisma.$queryRaw<AdminPermissionRow[]>`
        SELECT * FROM admin.fn_admin_permission_upsert(
          ${params.actorId}::int, ${params.userId}::int,
          ${params.permission}, ${params.granted}, ${params.ip ?? null}
        )`;
      return row;
    } catch (e) {
      mapSpError(e);
    }
  }

  async spRemovePermissions(params: {
    actorId: number;
    userId: number;
    permissions: string[];
    ip?: string;
  }): Promise<void> {
    try {
      await this.prisma.$queryRaw`
        SELECT admin.fn_admin_permission_remove(
          ${params.actorId}::int, ${params.userId}::int,
          ${params.permissions}::text[], ${params.ip ?? null}
        )`;
    } catch (e) {
      mapSpError(e);
    }
  }

  async spAssignGroup(params: {
    actorId: number;
    userId: number;
    groupId: number | null;
    ip?: string;
  }): Promise<UserRow> {
    try {
      const [row] = await this.prisma.$queryRaw<UserRow[]>`
        SELECT * FROM admin.fn_user_assign_group(
          ${params.actorId}::int, ${params.userId}::int,
          ${params.groupId}::int, ${params.ip ?? null}
        )`;
      return row;
    } catch (e) {
      mapSpError(e);
    }
  }
}
